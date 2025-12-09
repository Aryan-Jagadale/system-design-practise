import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SQSClient, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { SESClient, SendRawEmailCommand, SendEmailCommand } from "@aws-sdk/client-ses";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const awsConfig = {
    region: "us-east-1",
    credentials: {
        accessKeyId: "" || "",
        secretAccessKey: "" || ""
    }
};

const ddbClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(ddbClient);
const sqsClient = new SQSClient(awsConfig);
const sesClient = new SESClient(awsConfig);
const s3 = new S3Client(awsConfig);


const TABLE_NAME = "EmailEvents";
const QUEUE_URL = "https://sqs.ap-south-1.amazonaws.com/1233/TransactionalEmailQueue";
const FROM_EMAIL = "aryansjagadale@gmail.com";
const BUCKET = "transactional-email-assets-yourname";
// const FROM_EMAIL = "definitely-not-verified@xyz.com";

const render = (html, data) =>
    Object.keys(data).reduce(
        (s, k) => s.replace(new RegExp(`{{${k}}}`, "g"), data[k] ?? ""),
        html
    );


export const handler = async (event) => {
    for (const record of event.Records) {
        const msg = JSON.parse(record.body);
        const { idempotency_key, to_email, template_name, payload } = msg;

        try {
            // Render email

            const tmpl = await s3.send(new GetObjectCommand({
                Bucket: BUCKET,
                Key: `templates/${template_name}.html`
            }));
            // const html = render(await tmpl.Body.transformToString(), payload);
            let html = await tmpl.Body.transformToString();
            console.log("html", html);


            // Send via SES

            let downloadLink = "";
            if (payload.attachment_key) {
                const command = new GetObjectCommand({
                    Bucket: BUCKET,
                    Key: `attachments/${payload.attachment_key}`
                });
                const url = await getSignedUrl(s3, command, { expiresIn: 604800 }); // 7 days
                downloadLink = `<p><strong>Download your file:</strong> <a href="${url}" style="color:#0066cc;font-weight:bold;">Click here (valid 7 days)</a></p>`;
            }
            html = html
                .replace(/{{name/g, payload.name || "Customer")
                .replace(/{{order_id}}/g, payload.order_id || "N/A")
                .replace(/{{total}}/g, payload.total || "$0")
                .replace(/{{download_link}}/g, downloadLink);

            await sesClient.send(new SendEmailCommand({
                Source: FROM_EMAIL,
                Destination: { ToAddresses: [to_email] },
                Message: {
                    Subject: { Data: "Your Order has been Shipped!" },
                    Body: {
                        Html: { Data: html }
                    }
                }
            }));


            // Update DynamoDB status
            await docClient.send(new UpdateCommand({
                TableName: TABLE_NAME,
                Key: { idempotency_key },
                UpdateExpression: "SET #status = :delivered, provider = :prov, provider_message_id = :mid",
                ExpressionAttributeNames: { "#status": "status" },
                ExpressionAttributeValues: {
                    ":delivered": "DELIVERED",
                    ":prov": "ses",
                    ":mid": "sent-via-worker"
                }
            }));

            // Delete from queue
            const response = await sqsClient.send(new DeleteMessageCommand({
                QueueUrl: QUEUE_URL,
                ReceiptHandle: record.receiptHandle
            }));

            console.log("Email sent & deleted:", idempotency_key, response);

        } catch (error) {
            // console.error("Failed to send:", error);
            console.error("Failed to send email:", error.message, {
                idempotency_key,
                to_email,
                attempt_count: (record.messageAttributes?.ApproximateReceiveCount?.stringValue || "unknown")
            });
            return;
        }
    }
};

// For local testing
(async () => {
    await handler(
        {
            "Records": [
                {
                    "body": "{\"idempotency_key\": \"test-with-pdf-001\", \"to_email\": \"aryansjagadale@gmail.com\", \"template_name\": \"order_shipped\", \"payload\": {\"name\": \"Aryan\", \"order_id\": \"ORD-2025\", \"total\": \"$299\", \"attachment_key\": \"invoice-sample.pdf\"}}",
                    "receiptHandle": "dummy"
                }
            ]
        }
    )
        ;
})(); 