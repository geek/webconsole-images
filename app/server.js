'use strict';

const { join } = require('path');
const Blankie = require('blankie');
const Brule = require('brule');
const Api = require('cloudapi-gql');
const Crumb = require('crumb');
const Hapi = require('hapi');
const Sso = require('hapi-triton-auth');
const Inert = require('inert');
const Ui = require('my-joy-images');
const Scooter = require('scooter');


const {
  PORT = 8082,
  COOKIE_PASSWORD,
  COOKIE_DOMAIN,
  COOKIE_SECURE,
  COOKIE_HTTP_ONLY,
  SDC_KEY_PATH,
  SDC_ACCOUNT,
  SDC_KEY_ID,
  SDC_URL,
  SSO_URL,
  BASE_URL = `http://0.0.0.0:${PORT}`,
  NODE_ENV = 'development',
  NAMESPACE = 'images'
} = process.env;

const server = Hapi.server({
  port: PORT,
  host: '0.0.0.0',
  debug: { request: ['error'] },
  routes: {
    security: {
      hsts: true,
      xframe: 'deny',
      xss: true,
      noOpen: true,
      noSniff: false
    }
  }
});

process.on('unhandledRejection', (err) => {
  server.log(['error'], err);
  console.error(err);
});

async function main () {
  await server.register([
    {
      plugin: Brule,
      options: {
        auth: false
      }
    },
    {
      plugin: Crumb,
      options: {
        restful: true,
        cookieOptions: {
          isSecure: COOKIE_SECURE !== '0',
          domain: COOKIE_DOMAIN,
          isHttpOnly: false,
          ttl: 4000 * 60 * 60       // 4 hours
        }
      }
    },
    {
      plugin: Inert
    },
    {
      plugin: Scooter
    },
    {
      plugin: Blankie.plugin,
      options: {
        defaultSrc: ['self'],
        imgSrc: ['*', 'data:'],
        scriptSrc: ['self', 'unsafe-inline', 'http://unpkg.com', 'http://cdn.jsdelivr.net'],
        styleSrc: ['self', 'unsafe-inline', 'http://unpkg.com'],
        generateNonces: false
      }
    },
    {
      plugin: Sso,
      options: {
        ssoUrl: SSO_URL,
        baseUrl: BASE_URL,
        apiBaseUrl: SDC_URL,
        keyId: '/' + SDC_ACCOUNT + '/keys/' + SDC_KEY_ID,
        keyPath: SDC_KEY_PATH,
        permissions: { cloudapi: ['/my/*'] },
        isDev: NODE_ENV === 'development',
        cookie: {
          isHttpOnly: COOKIE_HTTP_ONLY !== '0',
          isSecure: COOKIE_SECURE !== '0',
          password: COOKIE_PASSWORD,
          ttl: 4000 * 60 * 60,       // 4 hours
          domain: COOKIE_DOMAIN
        }
      }
    },
    {
      plugin: Ui
    },
    {
      plugin: Api,
      options: {
        keyId: '/' + SDC_ACCOUNT + '/keys/' + SDC_KEY_ID,
        keyPath: SDC_KEY_PATH,
        apiBaseUrl: SDC_URL
      },
      routes: {
        prefix: `/${NAMESPACE}`
      }
    }
  ]);

  server.auth.default('sso');

  server.route({
    method: 'get',
    path: `/${NAMESPACE}/versions`,
    config: {
      auth: false,
      handler: {
        file: {
          path: join(__dirname, 'versions.json')
        }
      }
    }
  });

  await server.start();
  console.log(`server started at http://localhost:${server.info.port}`);
}

main();
