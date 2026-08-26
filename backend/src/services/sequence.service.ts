import { prisma } from '../config/db.js';

/**
 * Atomically reserves a block of plain sequential invoice numbers.
 * Uses STARTING_INVOICE_NUMBER env var if initializing the DB sequence row for the first time.
 * Returns the starting value of the reserved sequence block.
 */
export async function allocateSequenceNumbers(count: number): Promise<number> {
  if (count <= 0) return 1;

  const startValue = await prisma.$transaction(async (tx) => {
    // Find the first sequence row in the database
    let sequence = await tx.invoiceSequence.findFirst();

    // If it doesn't exist, create it using the env starting number seed (or default 1)
    if (!sequence) {
      const seedEnv = process.env.STARTING_INVOICE_NUMBER;
      const seedValue = seedEnv ? parseInt(seedEnv, 10) : 1;
      
      sequence = await tx.invoiceSequence.create({
        data: {
          nextValue: isNaN(seedValue) ? 1 : seedValue,
        },
      });
    }

    const currentStartValue = sequence.nextValue;

    // Increment nextValue by the count requested
    await tx.invoiceSequence.update({
      where: { id: sequence.id },
      data: {
        nextValue: currentStartValue + count,
      },
    });

    return currentStartValue;
  });

  return startValue;
}
