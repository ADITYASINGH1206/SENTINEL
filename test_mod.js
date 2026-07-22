import axios from 'axios';

async function test() {
    try {
        const res = await axios.post('http://localhost:8002/moderate/image', {
            post_id: 'test-123',
            image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1a/24701-nature-702.jpg/800px-24701-nature-702.jpg'
        });
        console.log(JSON.stringify(res.data, null, 2));
    } catch(err) {
        console.error(err.message);
        if (err.response) console.error(err.response.data);
    }
}
test();
