export class URLImpl {
    /**
     * If current query string is ?page=10&pageSize=30&showOldItem&name=abc
     * This function returns following object:
     *      {
     *          page: "10",
     *          pageSize: "30",
     *          showOldItem: "",
     *          name: "abc",
     *      }
     */
    static parseQueryString(location: Location): {[name: string]: string} {
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
     * If current path is /foo/12/bar/34/test/
     * This function returns as following cases
     * (1) Input: "foo", Output: "12"
     * (2) Input: "bar", Output: "34"
     * (3) Input: "test", Output: ""
     * (4) Input: "12", Output: null
     * (5) Input: <anything else>, Output: null
     */
    static path(location: Location, pathSegmentName: string): string | null {
        const currentPathSegments = location.pathname.split("/").filter(_ => _);
        for (let i = 0; i < currentPathSegments.length; i += 2) {
            if (pathSegmentName === currentPathSegments[i]) {
                return currentPathSegments[i + 1] || "";
            }
        }

        return null;
    }

    /**
     * When judging startWithPath("reg"), only following paths return true:
     *      /reg
     *      /reg/
     *      /reg/*
     */
    static startWithPath(location: Location, pathName: string): boolean {
        return location.pathname === `/${pathName}` || location.pathname.indexOf(`/${pathName}/`) === 0;
    }
}

export class URL {
    static queryString(): {[name: string]: string} {
        return URLImpl.parseQueryString(location);
    }

    static path(pathSegmentName: string): string | null {
        return URLImpl.path(location, pathSegmentName);
    }

    static startWithPath(pathName: string): boolean {
        return URLImpl.startWithPath(location, pathName);
    }
}
