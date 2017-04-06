/* global window, document */
import mitt from 'mitt'

export default class PageLoader {
  constructor (buildId) {
    this.buildId = buildId
    this.pageCache = {}
    this.pageLoadedHandlers = {}
    this.registerEvents = mitt()
    this.loadingRoutes = {}
  }

  normalizeRoute (route) {
    if (route[0] !== '/') {
      throw new Error('Route name should start with a "/"')
    }

    return route.replace(/index$/, '')
  }

  loadPageSync (route) {
    route = this.normalizeRoute(route)
    const cachedPage = this.pageCache[route]

    if (!cachedPage) {
      return null
    } else if (cachedPage.error) {
      throw cachedPage.error
    } else {
      return cachedPage.page
    }
  }

  loadPage (route) {
    route = this.normalizeRoute(route)

    const cachedPage = this.pageCache[route]
    if (cachedPage) {
      return new Promise((resolve, reject) => {
        if (cachedPage.error) return reject(cachedPage.error)
        return resolve(cachedPage.page)
      })
    }

    return new Promise((resolve, reject) => {
      const fire = ({ error, page }) => {
        this.registerEvents.off(route, fire)

        if (error) {
          reject(error)
        } else {
          resolve(page)
        }
      }

      this.registerEvents.on(route, fire)

      // Load the script if not asked to load yet.
      if (!this.loadingRoutes[route]) {
        this.loadScript(route)
        this.loadingRoutes[route] = true
      }
    })
  }

  loadScript (route) {
    route = this.normalizeRoute(route)

    const script = document.createElement('script')
    const url = `/_next/${encodeURIComponent(this.buildId)}/page${route}`
    script.src = url
    script.type = 'text/javascript'
    script.onerror = () => {
      const error = new Error(`Error when loading route: ${route}`)
      this.registerEvents.emit(route, { error })
    }

    document.body.appendChild(script)
  }

  // This method if called by the route code.
  registerPage (route, error, page) {
    route = this.normalizeRoute(route)

    // add the page to the cache
    this.pageCache[route] = { error, page }
    this.registerEvents.emit(route, { error, page })
  }

  clearCache (route) {
    route = this.normalizeRoute(route)
    delete this.pageCache[route]
    delete this.loadingRoutes[route]
  }
}