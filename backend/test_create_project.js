const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const token = JSON.parse(data).token;
    console.log('Got token:', token ? 'yes' : 'no');
    
    if (token) {
      const projReq = http.request({
        hostname: 'localhost',
        port: 5000,
        path: '/api/projects',
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
      }, (res2) => {
        let d2 = '';
        res2.on('data', c => d2 += c);
        res2.on('end', () => console.log('PROJECT STATUS:', res2.statusCode, d2));
      });
      projReq.write(JSON.stringify({name:'TestProject',description:'',priority:'medium',dueDate:'',memberIds:[]}));
      projReq.end();
    }
  });
});

// Since I made a TestUser in earlier conversation, I'll use that email. Or just register one.
req.write(JSON.stringify({email:'test2_diag@test.com',password:'123456'}));
req.end();
