import * as fs from 'fs';
import * as util from 'util';
import { cloneDeep } from 'lodash';
import { errors } from './errors';
import { spawn } from './spawn';
import { userAgents } from './useragents';

export type NodeCallback = (error: any, data: any) => void;

const cwd = process.cwd();
/**
 * Make some curl opts friendlier.
 */

const curl_map = {
  timeout: 'max-time',
  redirects: 'max-redirs',
  method: 'request',
  useragent: 'user-agent'
};

/**
 * Default user-agents.
 */

const user_agents_len = userAgents.length;

/**
 * Default request headers.
 */

const default_headers = {
  Accept: '*/*',
  'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
  'Accept-Language': 'en-US,en;q=0.8'
};

export interface Options {
  method?: string;
  rejectUnauthorized?: boolean;
  headers?: {
    [key: string]: string;
  };
  payload?: any;
  cwd?: string;
  curlBinaryPath?: string;
  stderr?: boolean;
  encoding?: string;
  userAgent?: string;
  user?: string;
  password?: string;
  /** parse data, encoding must be set  */
  parseData?: boolean;
  /** see `man curl` */
  rawOptions?: string[];
}

/**
 * Make a request with cURL.
 *
 * @param {Object|String} options (optional) - see `man curl`
 * @param {Function} callback (optional)
 * @api public
 */

export function request(url: string, options: Options, callback: NodeCallback) {
  const args: string[] = ['-i'];
  const method = (options.method || 'get').toUpperCase();
  const cmd = options.curlBinaryPath || 'curl';
  if (!('rejectUnauthorized' in options)) {
    options.rejectUnauthorized = true;
  }
  if (!options.rejectUnauthorized) {
    args.push('-k');
  }
  if (options.headers) {
    Object.keys(options.headers).forEach(key => {
      args.push(`-H ${key}:${options.headers[key]}`);
    });
  }
  if (options.userAgent) {
    args.push(`-A ${options.userAgent}`);
  }
  if (options.user) {
    args.push(
      `-u ${options.user}${options.password ? `:${options.password}` : ''}`
    );
  }
  if (options.payload) {
    if (typeof options.payload === 'object') {
      args.push(`-d ${JSON.stringify(options.payload)}`);
    }
  }

  args.push(`-X ${method}`);
  args.push(url);
  if (options.rawOptions) {
    args.push(...options.rawOptions);
  }
  spawn(
    cmd,
    args,
    {
      cwd: options.cwd
    },
    curl => {
      let totalLen = 0;
      const chunks = [];
      let stderr = '';
      curl.stdout.on('data', function(chunk) {
        totalLen += chunk.length;
        chunks.push(chunk);
      });

      //Pipe stderr to the current process?
      if (options.stderr === true) {
        curl.stderr.pipe(process.stderr);
        delete options.stderr;
      }
      curl.stderr.on('data', function(data) {
        stderr += data;
      });
      curl.on('close', code => {
        const finalData = Buffer.concat(chunks, totalLen);
        const error = errors[code];
        const data = options.encoding
          ? finalData.toString(options.encoding)
          : finalData;
        console.log('data', data);
        callback(error, {
          data:
            options.parseData && typeof data === 'string'
              ? parseData(data)
              : data,
          code,
          stderr
        });
      });
    }
  );
}

export function parseData(data: string) {
  console.log(data);
  const result: any = {
    headers: {}
  };
  const part1 = data.split('\r\n\r\n');
  result.content = part1.pop();
  part1[0].split('\r\n').forEach((part, i) => {
    switch (i) {
      case 0:
        const info = part.split(' ');
        result.httpVersion = info.shift();
        result.statusCode = info.shift();
        result.statusDescription = info.join(' ');
        break;
      default:
        const parts = part.split(': ');
        result.headers[parts[0].trim()] = parts[1].trim();
    }
  });
  return result;
}
