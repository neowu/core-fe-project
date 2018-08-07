import {URLImpl} from "util/URL";

test("queryString", () => {
    const location = {
        host: "127.0.0.1",
        search: "",
        pathname: "/",
        hash: "",
    } as Location;

    location.search = "?test=foo%20bar";
    expect(URLImpl.parseQueryString(location)).toEqual({
        test: "foo bar",
    });

    location.search = "?page=10&pageSize=30&showOldItem&name=abc";
    expect(URLImpl.parseQueryString(location)).toEqual({
        page: "10",
        pageSize: "30",
        showOldItem: "",
        name: "abc",
    });

    location.search = "";
    expect(URLImpl.parseQueryString(location)).toEqual({});
});

test("path", () => {
    const location = {
        host: "127.0.0.1",
        search: "",
        pathname: "/",
        hash: "",
    } as Location;

    location.pathname = "/foo/12/bar/34/test/";
    expect(URLImpl.path(location, "foo")).toEqual("12");
    expect(URLImpl.path(location, "12")).toEqual(null);
    expect(URLImpl.path(location, "bar")).toEqual("34");
    expect(URLImpl.path(location, "34")).toEqual(null);
    expect(URLImpl.path(location, "test")).toEqual("");
    expect(URLImpl.path(location, "other")).toEqual(null);

    location.pathname = "/foo/12///bar/34/test";
    expect(URLImpl.path(location, "foo")).toEqual("12");
    expect(URLImpl.path(location, "12")).toEqual(null);
    expect(URLImpl.path(location, "bar")).toEqual("34");
    expect(URLImpl.path(location, "34")).toEqual(null);
    expect(URLImpl.path(location, "test")).toEqual("");
    expect(URLImpl.path(location, "other")).toEqual(null);

    location.pathname = "/";
    expect(URLImpl.path(location, "")).toEqual(null);
    expect(URLImpl.path(location, "any")).toEqual(null);

    location.pathname = "/test";
    expect(URLImpl.path(location, "test")).toEqual("");
    expect(URLImpl.path(location, "any")).toEqual(null);
});

test("startWithPath", () => {
    const location = {
        host: "127.0.0.1",
        search: "",
        pathname: "/",
        hash: "",
    } as Location;

    location.pathname = "/reg";
    expect(URLImpl.startWithPath(location, "reg")).toEqual(true);
    expect(URLImpl.startWithPath(location, "re")).toEqual(false);
    expect(URLImpl.startWithPath(location, "REG")).toEqual(false);
    expect(URLImpl.startWithPath(location, "reg2")).toEqual(false);
    expect(URLImpl.startWithPath(location, "other")).toEqual(false);

    location.pathname = "/reg/123456";
    expect(URLImpl.startWithPath(location, "reg")).toEqual(true);
    expect(URLImpl.startWithPath(location, "re")).toEqual(false);
    expect(URLImpl.startWithPath(location, "REG")).toEqual(false);
    expect(URLImpl.startWithPath(location, "reg2")).toEqual(false);
    expect(URLImpl.startWithPath(location, "other")).toEqual(false);

    location.pathname = "/reg/";
    expect(URLImpl.startWithPath(location, "reg")).toEqual(true);
    expect(URLImpl.startWithPath(location, "re")).toEqual(false);
    expect(URLImpl.startWithPath(location, "REG")).toEqual(false);
    expect(URLImpl.startWithPath(location, "reg2")).toEqual(false);
    expect(URLImpl.startWithPath(location, "other")).toEqual(false);

    location.pathname = "/test/reg/";
    expect(URLImpl.startWithPath(location, "reg")).toEqual(false);
    expect(URLImpl.startWithPath(location, "test")).toEqual(true);
    expect(URLImpl.startWithPath(location, "test/reg")).toEqual(true);
    expect(URLImpl.startWithPath(location, "other")).toEqual(false);
});
