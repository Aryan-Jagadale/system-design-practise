class SimpleSQS {
    constructor() {
        this.queue = []; // Array of { id, body, sentAt, expiresAt, visibleUntil }
        this.nextId = 0;
        this.startCleanup();
    }
    generateId() {
        return `msg-${++this.nextId}-${Date.now()}`;
    }

    isExpired(message) {
        return Date.now() > message.expiresAt.getTime();
    }

    isVisible(message) {
        return !message.visibleUntil || Date.now() >= message.visibleUntil.getTime();
    }

    startCleanup() {
        setInterval(() => {
            this.queue = this.queue.filter(msg => !this.isExpired(msg));
            // Reset visibility timeouts (requeue invisible ones)
            this.queue.forEach(msg => {
                if (msg.visibleUntil && Date.now() >= msg.visibleUntil.getTime()) {
                    msg.visibleUntil = null;
                }
            });
        }, 5000);
    }


    sendMessage(body, delaySeconds = 0) {
        const now = new Date();
        const expiresAt = delaySeconds > 0
            ? new Date(now.getTime() + delaySeconds * 1000)
            : null;
        

        if (expiresAt && expiresAt > new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)) {
            throw new Error('Delay too long; max 14 days like SQS');
        }

        const message = {
            id: this.generateId(),
            body,
            sentAt: now,
            expiresAt: expiresAt || null,
            visibleUntil: null
        };

        this.queue.push(message);
        return { messageId: message.id };
    }

    async receiveMessage(maxMessages = 1, waitTimeSeconds = 0, visibilityTimeoutSeconds = 30) {

        if (waitTimeSeconds > 0 && this.queue.length === 0) {
            await new Promise(resolve => setTimeout(resolve, waitTimeSeconds * 1000));
        }

        
        const visibleMessages = this.queue
            .filter(msg => !this.isExpired(msg) && this.isVisible(msg))
            .slice(0, maxMessages);

        visibleMessages.forEach(msg => {
            msg.visibleUntil = new Date(Date.now() + visibilityTimeoutSeconds * 1000);
        });

        return {
            messages: visibleMessages.map(msg => ({
                messageId: msg.id,
                receiptHandle: msg.id,
                body: msg.body,
                attributes: {
                    ApproximateReceiveCount: 1,
                    SentTimestamp: msg.sentAt.getTime(),
                    ApproximateFirstReceiveTimestamp: Date.now()
                }
            }))
        };
    }

    deleteMessage(receiptHandle) {
        const index = this.queue.findIndex(msg => msg.id === receiptHandle);
        if (index === -1) {
            throw new Error('Message not found');
        }
        this.queue.splice(index, 1);
        return { success: true };
    }
}


async function demo() {
    const sqs = new SimpleSQS();

    // Send messages
    console.log('Sending messages...');
    sqs.sendMessage('Hello, World!', 10);
    sqs.sendMessage('Delayed Message', 5); // 5 seconds delay
    console.log('Receiving messages...');
    let result = await sqs.receiveMessage(2, 0, 3);
    console.log('Received:', result.messages.map(m => m.body));


    await new Promise(resolve => setTimeout(resolve, 4000));

    result = await sqs.receiveMessage(1);
    console.log('After timeout, received:', result.messages.map(m => m.body));


    if (result.messages.length > 0) {
        await sqs.deleteMessage(result.messages[0].receiptHandle);
        console.log('Deleted one message');
    }
    await new Promise(resolve => setTimeout(resolve, 6000));
    console.log('Queue after expiration:', sqs.queue.map(m => ({ id: m.id, body: m.body, expired: sqs.isExpired(m) })));
}

demo().catch(console.error);
