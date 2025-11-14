;; liquidity-vault.clar
;; A unique two-token liquidity vault that mints LP shares for balanced deposits.
;; New functionality: multiple deposit flows (initial, balanced, and deposit-for) and proportional withdrawals.

(define-constant TOKEN-A .token-a)
(define-constant TOKEN-B .token-b)
(define-constant SELF .liquidity-vault)

(define-constant ERR-NOT-INITIALIZED (err u10))
(define-constant ERR-ALREADY-INITIALIZED (err u11))
(define-constant ERR-BAD-RATIO (err u12))
(define-constant ERR-INSUFFICIENT-SHARES (err u13))

(define-data-var reserve-a uint u0)
(define-data-var reserve-b uint u0)
(define-data-var total-shares uint u0)
(define-map shares { owner: principal } { amount: uint })

(define-read-only (get-reserves)
  { a: (var-get reserve-a), b: (var-get reserve-b) }
)

(define-read-only (get-total-shares)
  (var-get total-shares)
)

(define-read-only (get-shares-of (who principal))
  (default-to u0 (get amount (map-get? shares { owner: who })))
)

(define-private (minu (x uint) (y uint)) (if (< x y) x y))

;; return true if |x - y| / max(x,y) <= tolerance-bps
(define-private (ratio-within (x uint) (y uint) (tolerance-bps uint))
  (let ((mx (if (> x y) x y))
       (mn (if (> x y) y x))
      )
    (if (is-eq mx u0)
        true
        (<= (* (- mx mn) u10000) (* mx tolerance-bps))
    )
  )
)

;; One-time initializer: first liquidity provider sets the baseline ratio
(define-public (deposit-initial (dx uint) (dy uint))
  (begin
    (asserts! (is-eq (var-get total-shares) u0) ERR-ALREADY-INITIALIZED)
    (asserts! (and (> dx u0) (> dy u0)) (err u1))
    (try! (contract-call? TOKEN-A transfer dx tx-sender SELF none))
    (try! (contract-call? TOKEN-B transfer dy tx-sender SELF none))
    (var-set reserve-a (+ (var-get reserve-a) dx))
    (var-set reserve-b (+ (var-get reserve-b) dy))
    (let ((minted (+ dx dy)))
      (var-set total-shares minted)
      (map-set shares { owner: tx-sender } { amount: minted })
      (ok minted)
    )
  )
)

;; Balanced deposit maintains the current pool ratio within a tolerance
(define-public (deposit-balanced (dx uint) (dy uint))
  (let (
        (ra (var-get reserve-a))
        (rb (var-get reserve-b))
        (ts (var-get total-shares))
      )
    (asserts! (> ts u0) ERR-NOT-INITIALIZED)
    (asserts! (and (> dx u0) (> dy u0)) (err u1))
    (let ((lhs (* dy ra)) (rhs (* dx rb)))
      (asserts! (ratio-within lhs rhs u100) ERR-BAD-RATIO) ;; 1% tolerance
      (try! (contract-call? TOKEN-A transfer dx tx-sender SELF none))
      (try! (contract-call? TOKEN-B transfer dy tx-sender SELF none))
      (let (
            (mintA (/ (* dx ts) ra))
            (mintB (/ (* dy ts) rb))
            (minted (minu (/ (* dx ts) ra) (/ (* dy ts) rb)))
          )
        (var-set reserve-a (+ ra dx))
        (var-set reserve-b (+ rb dy))
        (var-set total-shares (+ ts minted))
        (let ((prev (default-to u0 (get amount (map-get? shares { owner: tx-sender })))) )
          (map-set shares { owner: tx-sender } { amount: (+ prev minted) })
          (ok minted)
        )
      )
    )
  )
)

;; Deposit on behalf of a recipient (from sender's balances)
(define-public (deposit-for (recipient principal) (dx uint) (dy uint))
  (let (
        (ra (var-get reserve-a))
        (rb (var-get reserve-b))
        (ts (var-get total-shares))
      )
    (asserts! (> ts u0) ERR-NOT-INITIALIZED)
    (asserts! (and (> dx u0) (> dy u0)) (err u1))
    (let ((lhs (* dy ra)) (rhs (* dx rb)))
      (asserts! (ratio-within lhs rhs u100) ERR-BAD-RATIO)
      (try! (contract-call? TOKEN-A transfer dx tx-sender SELF none))
      (try! (contract-call? TOKEN-B transfer dy tx-sender SELF none))
      (let ((minted (minu (/ (* dx ts) ra) (/ (* dy ts) rb))))
        (var-set reserve-a (+ ra dx))
        (var-set reserve-b (+ rb dy))
        (var-set total-shares (+ ts minted))
        (let ((prev (default-to u0 (get amount (map-get? shares { owner: recipient })))) )
          (map-set shares { owner: recipient } { amount: (+ prev minted) })
          (ok minted)
        )
      )
    )
  )
)

(define-public (withdraw (burn uint))
  (let ((ts (var-get total-shares)))
    (asserts! (> ts u0) ERR-NOT-INITIALIZED)
    (let ((user (default-to u0 (get amount (map-get? shares { owner: tx-sender })))) )
      (asserts! (and (> burn u0) (<= burn user)) ERR-INSUFFICIENT-SHARES)
      (let ((ra (var-get reserve-a)) (rb (var-get reserve-b)))
        (let ((out-a (/ (* burn ra) ts)) (out-b (/ (* burn rb) ts)))
          ;; update accounting
          (map-set shares { owner: tx-sender } { amount: (- user burn) })
          (var-set total-shares (- ts burn))
          (var-set reserve-a (- ra out-a))
          (var-set reserve-b (- rb out-b))
          ;; transfer tokens to user from contract
          (as-contract
            (begin
              (try! (contract-call? TOKEN-A transfer out-a SELF tx-sender none))
              (try! (contract-call? TOKEN-B transfer out-b SELF tx-sender none))
              (ok { a: out-a, b: out-b })
            )
          )
        )
      )
    )
  )
)
