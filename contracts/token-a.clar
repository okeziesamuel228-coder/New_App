;; token-a.clar - Simple SIP-010-like fungible token used for testing liquidity deposits

(define-data-var total-supply uint u0)
(define-map balances { owner: principal } { amount: uint })

(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-INSUFFICIENT_BALANCE (err u101))

(define-read-only (get-balance (who principal))
  (default-to u0 (get amount (map-get? balances { owner: who })))
)

(define-read-only (get-total-supply)
  (var-get total-supply)
)

(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (> amount u0) (err u1))
    ;; Authorization: either the transaction sender moves their own funds, or a contract moves its own balance
    (asserts! (or (is-eq sender tx-sender) (is-eq sender (contract-caller))) ERR-NOT-AUTHORIZED)
    (let ((sender-bal (default-to u0 (get amount (map-get? balances { owner: sender }))))
         )
      (asserts! (>= sender-bal amount) ERR-INSUFFICIENT_BALANCE)
      (map-set balances { owner: sender } { amount: (- sender-bal amount) })
      (let ((recip-bal (default-to u0 (get amount (map-get? balances { owner: recipient })))) )
        (map-set balances { owner: recipient } { amount: (+ recip-bal amount) })
        (ok true)
      )
    )
  )
)

(define-public (mint (to principal) (amount uint))
  (begin
    (let ((bal (default-to u0 (get amount (map-get? balances { owner: to })))) )
      (map-set balances { owner: to } { amount: (+ bal amount) })
      (var-set total-supply (+ (var-get total-supply) amount))
      (ok true)
    )
  )
)
