import { curl, ParsedData } from './index';

describe('index', () => {
  it('should get data', async () => {
    const url =
      'http://www.codingpedia.org/ama/how-to-test-a-rest-api-from-command-line-with-curl/';
    const resp = await curl(url, {
      rejectUnauthorized: false,
      encoding: 'utf8',
      method: 'post',
      parseData: true
    });
    expect(resp.data).toBeDefined();
    expect((<ParsedData>resp.data).statusCode).toBe(405);
  });
});
