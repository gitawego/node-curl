import { request, parseData } from './index';

request(
  'http://www.codingpedia.org/ama/how-to-test-a-rest-api-from-command-line-with-curl/',
  {
    rejectUnauthorized: false,
    encoding: 'utf8',
    rawOptions: ['--silent'],
    method: 'post',
    parseData: true
  },
  (err, data) => {
    console.log(err, data);
  }
);
