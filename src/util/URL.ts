export class URLImpl {
    /**
     * if query string is ?page=10&pageSize=30&showOldItem&name=abc
     * it returns following object:
     *      {
     *          page: "10",
     *          pageSize: "30",
     *          showOldItem: "",
     *          name: "abc",
     *      }
     */
    static queryParams(location: Location): {[name: string]: string} {
        const queryString = location.search;
        const query = {};
        (queryString[0] === "?" ? queryString.substr(1) : queryString)
            .split("&")
            .filter(_ => _)
            .forEach(item => {
                const pair = item.split("=");
                query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || "");
            });
        return query;
    }

    /**
     * if path is /foo/12/bar/34/test/
     * it returns as following:
     * (1) Input: "foo", Output: "12"
     * (2) Input: "bar", Output: "34"
     * (3) Input: "test", Output: null
     * (5) Input: <something not in path segment>, Output: null
     */
    static pathParam(location: Location, segment: string): string | null {
        const segments = location.pathname.split("/").filter(_ => _);
        for (let i = 0; i < segments.length; i++) {
            if (segment === segments[i]) {
                return segments[i + 1] || null;
            }
        }
        return null;
    }

    /**
     * with startWithPath("reg"), only following paths return true:
     *      /reg
     *      /reg/
     *      /reg/*
     */
    static startWithPath(location: Location, pathName: string): boolean {
        return location.pathname === `/${pathName}` || location.pathname.indexOf(`/${pathName}/`) === 0;
    }
}

export class URL {
    static queryParams(): {[name: string]: string} {
        return URLImpl.queryParams(location);
    }

    static pathParam(segment: string): string | null {
        return URLImpl.pathParam(location, segment);
    }

    static startWithPath(segment: string): boolean {
        return URLImpl.startWithPath(location, segment);
    }
}
