const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


let ELASTICSEARCH_NODE = 'http://localhost:9200'
let INDEX_NAME = 'products'
const esClient = new Client({
    node: ELASTICSEARCH_NODE,
});


app.get("/", async (req, res) => {
    res.status(200).json({
        "msg": "Hello !"
    })
})

app.get('/health', (req, res) => {
    res.json({ status: 'ok', elasticsearch: ELASTICSEARCH_NODE });
});


app.get('/autocomplete', async (req, res) => {
    const { q } = req.query;

    console.log("q", q)

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json([]);
    }

    const prefix = q.trim();

    try {
        // const result = await esClient.search({
        //     index: INDEX_NAME || 'products',
        //     body: {
        //         query: {
        //             match_phrase_prefix: {
        //                 "record.name": {
        //                     query: searchQuery,
        //                     max_expansions: 50,
        //                     slop: 0
        //                 }
        //             }
        //         },
        //         size: 10, // return top 10 suggestions
        //         _source: ['record.name', 'record.price', 'record.description'] // only fetch what you need
        //     }
        // });

        const result = await esClient.search({
            index: INDEX_NAME,
            body: {
                suggest: {
                    product_suggest: {
                        prefix: prefix,
                        completion: {
                            field: 'name_suggest',
                            fuzzy: {
                                fuzziness: 'AUTO',
                                prefix_length: 2,
                                transpositions: true
                            },
                            size: 10
                        }
                    }
                },
            }
        });
        console.log("Suggester raw:", JSON.stringify(result.suggest, null, 2));

        const suggestions = result.suggest.product_suggest[0]?.options?.map(opt => ({
            name: opt.text,
            score: opt._score, 
        })) || [];

        res.json(suggestions);
    } catch (error) {
        console.error('Elasticsearch error:', error.meta?.body?.error || error.message);
        res.status(500).json({
            error: 'Search failed',
            details: error.message
        });
    }


})
app.listen(3000, () => console.log('Express on http://localhost:3000'));

