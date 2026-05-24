.data
# (No data needed for now)
.text
.globl main
main:
# ---- Register Initialization ----
addi $t0, $zero, 16
addi $t1, $zero, 8
addi $t2, $zero, 3
# ---- R-Format Instructions ----
add $t3, $t0, $t1
sub $t4, $t3, $t2
# ---- Memory Operations ----
la $t0, 0x10010000
sw $t4, 4($t0)
lw $t5, 0($t0)

addi $t6, $zero, 100
END:
nop
