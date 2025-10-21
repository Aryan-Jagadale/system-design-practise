class Participant {
    constructor(id, name) {
        this.id = id;
        this.name = name;
        this.prepared = false;
        this.committed = false;
        this.balance = 1000; // Mock initial balance
    }
    async prepare(amount, timeout = 5000) {
        await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

        if (Math.random() < 0.2) {
            throw new Error(`Participant ${this.name} cannot prepare: insufficient resources`);
        }

        if (this.balance < amount) {
            throw new Error(`Participant ${this.name} cannot prepare: low balance`);
        }

        this.prepared = true;
        console.log(`[Participant ${this.name}] Prepared for debit of $${amount}`);
        return true;
    }
    async commit(amount) {
        this.balance -= amount;
        this.committed = true;
        console.log(`[Participant ${this.name}] Committed: new balance $${this.balance}`);
    }

    async rollback() {
        this.prepared = false;
        console.log(`[Participant ${this.name}] Rolled back: balance unchanged at $${this.balance}`);
    }
}

class Coordinator {
    constructor(participants) {
        this.participants = participants;
    }

    async executeTransaction(fromParticipantId, toParticipantId, amount) {
        console.log(`\n=== Starting Distributed Transaction: Transfer $${amount} from ${fromParticipantId} to ${toParticipantId} ===`);

        const from = this.participants.find(p => p.id === fromParticipantId);
        const to = this.participants.find(p => p.id === toParticipantId);

        if (!from || !to) {
            throw new Error('Invalid participants');
        }
        console.log('\n--- Phase 1: Prepare ---');

        const preparePromises = this.participants.map(async (p) => {
            try {
                const vote = await p.prepare(amount);
                return { id: p.id, vote, error: null };
            } catch (error) {
                return { id: p.id, vote: false, error: error.message };
            }
        });

        const votes = await Promise.all(preparePromises);
        const allYes = votes.every(v => v.vote);

        if (!allYes) {
            const failures = votes.filter(v => !v.vote);
            console.log(`Failures: ${failures.map(f => f.error).join(', ')}`);
            throw new Error('Not all participants prepared successfully');
        }

        console.log('\n--- All participants prepared! ---');

        // Phase 2: Commit (or rollback on timeout/error)
        console.log('\n--- Phase 2: Commit ---');
        await Promise.all(this.participants.map(p => p.commit(amount)));
        console.log('\n=== Transaction Committed Successfully! ===');

        // Log final balances
        this.participants.forEach(p => console.log(`${p.name} balance: $${p.balance}`));

        try {

        } catch (error) {
            console.log(`\n--- Rollback due to: ${error.message} ---`);
            await Promise.all(this.participants.map(p => p.rollback()));
            console.log('=== Transaction Rolled Back! ===');
        }

    }
}



const participants = [
  new Participant(1, 'BankA'),
  new Participant(2, 'BankB'),
  new Participant(3, 'BankC')
];


const coordinator = new Coordinator(participants);


async function simulate() {
  try {
    await coordinator.executeTransaction(1, 2, 200);
  } catch (error) {
    console.error('Simulation error:', error.message);
  }
}

// simulate();

for (let i = 0; i < 5; i++) {
  setTimeout(() => simulate(), i * 2000);
}