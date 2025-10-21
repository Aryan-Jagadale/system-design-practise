class TriggerEngine {
    constructor(maxPerField = 50) {
        this.dataStore = new Map();
        this.triggerStore = new Map();
        this.maxPerField = maxPerField;
    }


    addTrigger(field, condition, callback) {
        if (!this.triggerStore.has(field)) {
            this.triggerStore.set(field, []);
        }

        const triggers = this.triggerStore.get(field);

        if (triggers.length >= this.maxPerField) {
            throw new Error(`Maximum triggers for field "${field}" reached.`);
        }

        triggers.push({ condition, action: callback });
    }
    setRecord(recordId, newData) {
        const oldData = this.dataStore.get(recordId) || {};
        this.dataStore.set(recordId, { ...oldData, ...newData });
        this.evaluateTriggers(recordId);

    }

    evaluateTriggers(recordId) {
        const record = this.dataStore.get(recordId);
        if (!record) return;
        // Check each field's triggers
        for (const [field, triggers] of this.triggerStore.entries()) {
            if (!(field in record)) continue; // Only evaluate if field updated or exists

            triggers.forEach(({ condition, action }) => {
                if (this.checkCondition(record, condition)) {
                    action(recordId, record);
                }
            });
        }
    }

    checkCondition(record, conditionStr) {
        const clauses = conditionStr.split("&&").map(c => c.trim());
        for (const clause of clauses) {
            const [field, operator, valueRaw] = clause.split(/\s+/); // e.g. age === 18
            let value = valueRaw;

            // Convert string to number or boolean
            if (value === 'true') value = true;
            else if (value === 'false') value = false;
            else if (!isNaN(Number(value))) value = Number(value);

            if (operator !== '==' && operator !== '===') {
                throw new Error(`Unsupported operator: ${operator}`);
            }

            if (record[field] !== value) {
                return false; // condition not met
            }
        }
        return true;
    }





}


const engine = new TriggerEngine();

engine.addTrigger(
    "age",
    "age === 18 && eligible_vote === true",
    (id, rec) => {
        console.log(`Trigger fired for ${id}:`, rec);
    }
);



// Insert data
engine.setRecord(1, { age: 17, eligible_vote: false }); // no trigger
engine.setRecord(1, { age: 18, eligible_vote: true });  // fires trigger