# hapi-router.helper

> add extended router functionality to hapi

[![npm version][npm-badge]][npm-url]


You can use this plugin to add extended router to your hapi projects.

 - async-await handler
 - nested route and route aliases
 - extract each handler from mixed-methods-handler with appropriate validate

# requiements
You need es7 supported javascript development environment or use Typescript


# Usage

Example:
```js
const server = new Hapi.server()

const plugins = [
  ...
  {
    register: require('hapi-router-extended'),
  },
  ...
];

server.register(plugins, (err) => {
  ...
  // mix methods and validation
  server.route({
    path: '/',
    method: ['get', 'post'],
    config: {
      validate: {
        query: {
          id: Joi.number().integer().required()
        },
        payload: {
          name: Joi.string().required()
        }
      },
    }
    handler: (request, reply) => {
      ...
      reply({result: 'some result'});
    }
  });

  // async-await handler
  server.route({
    path: '/',
    method: 'get',
    handler: async (request, reply) => {
      const result = await yourAsyncJob(); // the async job might be returning Promise object
      reply(result);
    }
  });

  // do nest!
  const nestedRoute = server.route.nested('/api')
  nestedRoute({
    path: '/ok2', // generated path is /api/ok2
    method: 'get',
    handler: (request, reply) => {
      reply('ok2');
    }
  });

  // you can route with arguments.
  // nestedRoute[method](
  //   path: String,
  //   config: Hapi.RouteAdditionalConfigurationOptions,
  //   handler: (request: Hapi.Request, reply: Hapi.Reply
  // ) => void)
  // methods: 'get', 'post', 'put', 'del', 'any'
  nestedRoute.get('/ok3/{id}', { // generated path is /api/ok3/{id}
    validate: {
      params: {
        id: Joi.number().integer().required(),
      },
    }
  }, (request, reply) => {
    reply(request.params.id)
  })

  // you can also nest from already nested router
  const doubleNestedRoute = nestedRoute.nested('/user')
  doubleNestedRoute({
    path: '/show', // generated path is /api/user/show
    method: 'get',
    handler: (request, reply) => {
      reply('howdy!')
    }
  })
  ...
})
```

[npm-url]: https://www.npmjs.com/package/hapi-router-helper
[npm-badge]: https://img.shields.io/npm/v/hapi-router-helper.svg
