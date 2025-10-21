const { MongoClient } = require('mongodb');
const { SagaBuilder, SagaExecutionFailed, SagaCompensationFailed } = require('node-sagas');


async function connectToDB(uri, dbName) {
  const client = new MongoClient(uri);
  await client.connect();
  return client.db(dbName);
}

// BankA Service (DB1: localhost:27017/banka)
class BankAService {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('balances');
  }

  async debit(amount, session) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500)); // Delay sim

    const doc = await this.collection.findOne({ _id: 'main' }, { session });
    let balance = doc ? doc.balance : 1000;

    if (balance < amount) {
      throw new Error('BankA: Insufficient funds');
    }

    if (Math.random() < 0.05) { // Rare failure on debit
      throw new Error('BankA: Simulated debit failure');
    }

    balance -= amount;
    await this.collection.updateOne(
      { _id: 'main' },
      { $set: { balance } },
      { session, upsert: true }
    );

    console.log(`[BankA] Debited $${amount}: balance $${balance}`);
    return { balance };
  }

  async credit(amount, session) { // Compensator
    await new Promise(resolve => setTimeout(resolve, Math.random() * 300));

    const doc = await this.collection.findOne({ _id: 'main' }, { session });
    let balance = doc ? doc.balance : 1000;
    balance += amount;

    await this.collection.updateOne(
      { _id: 'main' },
      { $set: { balance } },
      { session, upsert: true }
    );

    console.log(`[BankA] Compensated: Credited back $${amount}: balance $${balance}`);
  }
}

// BankB Service (DB2: localhost:27018/bankb)
class BankBService {
  constructor(db) {
    this.db = db;
    this.collection = db.collection('balances');
  }

  async credit(amount, session) {
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500));

    const doc = await this.collection.findOne({ _id: 'main' }, { session });
    let balance = doc ? doc.balance : 1000;

    if (Math.random() < 0.2) {
      throw new Error('BankB: Simulated credit failure (e.g., network issue)');
    }

    balance += amount;
    await this.collection.updateOne(
      { _id: 'main' },
      { $set: { balance } },
      { session, upsert: true }
    );

    console.log(`[BankB] Credited $${amount}: balance $${balance}`);
    return { balance };
  }
}

// Saga Orchestrator (Fixed Session Creation)
async function executeSagaTransfer(amount) {
  const dbA = await connectToDB('mongodb://localhost:27017', 'banka');
  const dbB = await connectToDB('mongodb://localhost:27018', 'bankb');
  const bankA = new BankAService(dbA);
  const bankB = new BankBService(dbB);

  try {
    console.log(`\n=== Starting Saga: Transfer $${amount} from BankA to BankB ===`);


    const sagaBuilder = new SagaBuilder();
    const saga = sagaBuilder
      .step('Debit BankA')
      .invoke(async (context) => {
        const session = dbA.client.startSession();
        session.startTransaction();
        try {
          context.bankA = await bankA.debit(amount, session);
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          await session.endSession();
        }
      })
      .withCompensation(async (context) => {
        const session = dbA.client.startSession();
        session.startTransaction();
        try {
          await bankA.credit(amount, session);
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          console.error('[Saga] Compensation failed for BankA:', err.message);
          // Note: In prod, we'd retry or alert; here we log
        } finally {
          await session.endSession();
        }
      })
      .step('Credit BankB')
      .invoke(async (context) => {
        const session = dbB.client.startSession();
        session.startTransaction();
        try {
          context.bankB = await bankB.credit(amount, session);
          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          throw err;
        } finally {
          await session.endSession();
        }
      })
      // No .withCompensation() for last step
      .build();


    const result = await saga.execute({});

    console.log('\n=== Saga Completed Successfully! ===');
    console.log(`BankA final balance: $${result.bankA.balance}`);
    console.log(`BankB final balance: $${result.bankB.balance}`);

  } catch (error) {
    if (error instanceof SagaExecutionFailed) {
      console.log(`\n--- Saga Execution Failed (but compensated): ${error.message} ---`);
    } else if (error instanceof SagaCompensationFailed) {
      console.log(`\n--- Saga Compensation Failed: ${error.message} ---`);
    } else {
      console.log(`\n--- Saga Failed: ${error.message} ---`);
    }
    console.log('Compensations attempted.');
  } finally {
    await dbA.client.close();
    await dbB.client.close();
  }
}

async function simulate() {
  await executeSagaTransfer(200);
}

// Execute (run multiple for failures)
for (let i = 0; i < 5; i++) {
  setTimeout(simulate, i * 4000);
}

// simulate();