; CMPE-102 — Week 11
; Problems:
; 1) P = -M * (N + B)
; 2) P = sqrt(N) + B   (B is int)
; 3) if (X < Y) print
; 4) R = ((A+B)/C) * ((D-A)+E)

INCLUDE Irvine32.inc

.data
; Problem 1
B1  REAL8 7.8
M1  REAL8 3.6
N1  REAL8 7.1
P1  REAL8 ?
t1  BYTE  "P1 = -M*(N+B) = ",0

; Problem 2 
B2  SDWORD 7          ; int
N2  REAL8  7.1
P2  REAL8  ?
t2  BYTE  "P2 = sqrt(N) + B = ",0

; Problem 3 
X   REAL8  2.5        ; test  
Y   REAL8  3.0
msgLo   BYTE "X is lower",0
msgNot  BYTE "X is not lower",0

; Problem 4 
A4  REAL8 1.5
B4  REAL8 2.0
C4  REAL8 3.0
D4  REAL8 9.0
E4  REAL8 4.0
R4  REAL8 ?
t4  BYTE  "R = ((A+B)/C) * ((D-A)+E) = ",0

.code
main PROC

;  1) P = -M * (N + B) 
    fld  N1                 ; ST0 = N
    fadd B1                 ; ST0 = N + B
    fld  M1                 ; ST0 = M, ST1 = N+B
    fchs                    ; ST0 = -M
    fmulp st(1), st(0)      ; ST0 = (-M)*(N+B)
    fstp P1
    mov  edx, OFFSET t1
    call WriteString
    fld  P1
    call WriteFloat
    call Crlf

; 2) P = sqrt(N) + B (int) 
    fld   N2                ; ST0 = N
    fsqrt                   ; ST0 = sqrt(N)
    fild  B2                ; push int B as float
    faddp st(1), st(0)      ; ST0 = sqrt(N) + B
    fstp  P2
    mov  edx, OFFSET t2
    call WriteString
    fld  P2
    call WriteFloat
    call Crlf

;  3) if (X < Y) 
    fld  X
    fcom qword ptr Y        ; compare ST0 (X) with Y
    fstsw ax
    sahf
    jb   XLower             ; CF=1 -> X<Y
    mov  edx, OFFSET msgNot
    jmp  Print3
XLower:
    mov  edx, OFFSET msgLo
Print3:
    call WriteString
    call Crlf
    fstp st(0)              ; clean ST0 (pop X)

;  4) R = ((A+B)/C) * ((D-A)+E) 
    fld  A4                 ; ST0 = A
    fadd B4                 ; ST0 = A+B
    fld  C4                 ; ST0 = C, ST1 = A+B
    fdivp st(1), st(0)      ; ST0 = (A+B)/C
    fld  D4                 ; ST0 = D, ST1 = part1
    fsub A4                 ; ST0 = D-A
    fadd E4                 ; ST0 = (D-A)+E
    fmulp st(1), st(0)      ; ST0 = part1 * ((D-A)+E)
    fstp R4
    mov  edx, OFFSET t4
    call WriteString
    fld  R4
    call WriteFloat
    call Crlf

    exit
main ENDP
END main
