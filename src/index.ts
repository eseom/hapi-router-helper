import * as Boom from 'boom'
import * as Hapi from 'hapi'
import * as Joi from 'joi'
import * as _ from 'lodash'

export interface IRegister {
  (server: Hapi.Server, options: object, next: () => void): void
  attributes?: object
}

const internals = {
  /**
   * supports async handler for routes in environments using Babel-ES7 or Typescript
   */
  asyncHandler: (server: Hapi.Server) => {
    const origRoute = server.root.route
    const innerRoute = (options: Hapi.RouteConfiguration) => {
      if (options.handler) {
        if (options.handler instanceof Function) {
          const t = options.handler
          options.handler = (request: Hapi.Request, reply: Hapi.ReplyNoContinue) => {
            const p: Promise<any> | void = t(request, reply)
            if (p && (<Promise<any>>p).catch) {
              (<Promise<any>>p).catch((e: Error) => {
                if (e.stack) {
                  console.error(e.stack)
                }
                console.error(e.toString())
                reply(Boom.badGateway('server error'))
              })
            }
          }
        }
      }
      return origRoute.apply(server.root, [options])
    }

    server.root.route = (options: Hapi.RouteConfiguration | Hapi.RouteConfiguration[]) => {
      if (Array.isArray(options)) {
        return options.forEach(o => innerRoute(o))
      }
      innerRoute(options)
    }

    Object.keys(origRoute).forEach((k) => {
      server.root.route[k] = origRoute[k]
    })
  },
  /**
   * supports simple nested routes
   */
  nestedRoute: (server: Hapi.Server) => {
    const origRoute = server.root.route
    const makeRoutes = (prefix = '') => {
      const methods = ['get', 'post', 'put', 'del', 'any']
      const innerRoute = (routeOptions) => {
        routeOptions.path = `${prefix}${routeOptions.path}`
        origRoute.apply(server, [routeOptions])
      }

      Object.keys(origRoute).forEach((k) => {
        innerRoute[k] = origRoute[k];
      });

      methods.forEach((hm) => {
        let method = hm.toUpperCase()
        if (hm === 'any') method = '*'
        if (hm === 'del') method = 'delete'
        innerRoute[hm] = (path, config, handler) => {
          return origRoute.apply(server.root, [{
            path: `${prefix}${path}`,
            method,
            handler,
            config,
          }])
        }
      })

      innerRoute['nested'] = (prefixNested) => makeRoutes(`${prefix}${prefixNested}`)
      return innerRoute
    }
    server.root.route = makeRoutes()
  },
  /**
   * supports mixed methods and validations for handlers
   */
  assistMixedMethod: (server: Hapi.Server) => {
    const origRoute = server.root.route

    const innerRoute = (options: Hapi.RouteConfiguration) => {
      if (_.isArray(options.method)) {
        (options.method as string[]).map((o): Hapi.RouteConfiguration => {
          if (['get', 'head', 'delete'].indexOf(o.toLowerCase()) !== -1) {
            let validate = null
            if (options.config && (<Hapi.RouteAdditionalConfigurationOptions>options.config).validate) {
              validate = {
                ...(<Hapi.RouteAdditionalConfigurationOptions>options.config).validate,
                payload: null,
              }
            }
            return {
              ...options,
              method: o as any,
              config: {
                validate,
              }
            }
          } else {
            return {
              ...options,
              method: o as any,
            }
          }
        }).forEach((o) => {
          innerRoute(o)
        })
        return
      }
      return origRoute.apply(server.root, [options])
    }

    server.root.route = (options: Hapi.RouteConfiguration | Hapi.RouteConfiguration[]) => {
      if (Array.isArray(options)) {
        return options.forEach(o => innerRoute(o))
      }
      innerRoute(options)
    }

    Object.keys(origRoute).forEach((k) => {
      server.root.route[k] = origRoute[k]
    })
  },
}

const register: IRegister = (server: Hapi.Server, options: Object, next: () => void) => {
  internals.asyncHandler(server)
  internals.nestedRoute(server)
  internals.assistMixedMethod(server)
  next()
}

register.attributes = {
  name: 'hapi-router-helper',
}

export {
  register,
}
