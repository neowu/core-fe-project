import {URLImpl} from "util/URL";

test("queryParams", () => {
    const location = {
        host: "127.0.0.1",
        search: "",
        pathname: "/",
        hash: "",
    } as Location;

    location.search = "?test=foo%20bar";
    expect(URLImpl.queryParams(location)).toEqual({
        test: "foo bar",
    });

    location.search = "?page=10&pageSize=30&showOldItem&name=abc";
    expect(URLImpl.queryParams(location)).toEqual({
        page: "10",
        pageSize: "30",
        showOldItem: "",
        name: "abc",
    });

    location.search = "";
    expect(URLImpl.queryParams(location)).toEqual({});
});

test("pathParam", () => {
    const location = {
        host: "127.0.0.1",
        search: "",
        pathname: "/",
        hash: "",
    } as Location;

    location.pathname = "/foo/12/bar/34/test/";
    expect(URLImpl.pathParam(location, "foo")).toEqual("12");
    expect(URLImpl.pathParam(location, "bar")).toEqual("34");
    expect(URLImpl.pathParam(location, "test")).toEqual(null);
    expect(URLImpl.pathParam(location, "other")).toEqual(null);

    location.pathname = "/foo/12///bar/34/test";
    expect(URLImpl.pathParam(location, "foo")).toEqual("12");
    expect(URLImpl.pathParam(location, "bar")).toEqual("34");
    expect(URLImpl.pathParam(location, "test")).toEqual(null);
    expect(URLImpl.pathParam(location, "other")).toEqual(null);

    location.pathname = "/foo/bar/005";
    expect(URLImpl.pathParam(location, "bar")).toEqual("005");
    expect(URLImpl.pathParam(location, "005")).toEqual(null);
    expect(URLImpl.pathParam(location, "other")).toEqual(null);

    location.pathname = "/";
    expect(URLImpl.pathParam(location, "")).toEqual(null);
    expect(URLImpl.pathParam(location, "any")).toEqual(null);

    location.pathname = "/test";
    expect(URLImpl.pathParam(location, "test")).toEqual(null);
    expect(URLImpl.pathParam(location, "any")).toEqual(null);
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
