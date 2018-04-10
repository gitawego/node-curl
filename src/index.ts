import { errors } from './errors';
import { spawn } from './spawn';
// import { userAgents } from './useragents';
const cwd = process.cwd();
export type NodeCallback = (error: any, data: any) => void;

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

export function curl(url: string, options: Options) {
  return new Promise((resolve, reject) => {
    request(url, options, (err, resp) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(resp);
    });
  });
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
  args.push(`-X`, method);
  args.push(url);
  if (options.headers) {
    Object.keys(options.headers).forEach(key => {
      args.push(`-H`, `${key}:${options.headers[key]}`);
    });
  }
  if (options.userAgent) {
    args.push(`-A`, options.userAgent);
  }
  if (options.user) {
    args.push(
      `-u`,
      `${options.user}${options.password ? `:${options.password}` : ''}`
    );
  }
  if (options.payload) {
    const payload =
      typeof options.payload === 'object'
        ? JSON.stringify(options.payload)
        : options.payload;
    args.push(`-d`, payload);
  }
  if (options.rawOptions) {
    args.push(...options.rawOptions);
  }

  spawn(
    cmd,
    args,
    {
      cwd: options.cwd || cwd
    },
    curl => {
      let totalLen = 0;
      const chunks: Buffer[] = [];
      let stderr = '';
      curl.stdout.on('data', function(chunk) {
        totalLen += chunk.length;
        chunks.push(chunk as Buffer);
      });

      // Pipe stderr to the current process?
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

export interface ParsedData {
  headers: {
    [key: string]: string;
  };
  httpVersion: string;
  statusCode: string;
  statusDescription: string;
  content: any;
}
export function parseData(data: string): ParsedData {
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
        result.statusCode = Number(info.shift());
        result.statusDescription = info.join(' ');
        break;
      default:
        const parts = part.split(': ');
        result.headers[parts[0].trim().toLowerCase()] = parts[1].trim();
    }
  });
  if (result.headers['content-type'].match(/application\/json/)) {
    result.content = JSON.parse(result.content);
  }
  return result;
}
