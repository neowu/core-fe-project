import {URLImpl} from "util/URL";

const mockLocation = {
    host: "127.0.0.1",
    search: "",
    pathname: "/",
    hash: "",
} as Location;

test("queryString", () => {
    mockLocation.search = "?test=foo%20bar";
    expect(URLImpl.parseQueryString(mockLocation)).toEqual({
        test: "foo bar",
    });

    mockLocation.search = "?page=10&pageSize=30&showOldItem&name=abc";
    expect(URLImpl.parseQueryString(mockLocation)).toEqual({
        page: "10",
        pageSize: "30",
        showOldItem: "",
        name: "abc",
    });

    mockLocation.search = "";
    expect(URLImpl.parseQueryString(mockLocation)).toEqual({});
});

test("path", () => {
    mockLocation.pathname = "/foo/12/bar/34/test/";
    expect(URLImpl.path(mockLocation, "foo")).toEqual("12");
    expect(URLImpl.path(mockLocation, "12")).toEqual(null);
    expect(URLImpl.path(mockLocation, "bar")).toEqual("34");
    expect(URLImpl.path(mockLocation, "34")).toEqual(null);
    expect(URLImpl.path(mockLocation, "test")).toEqual("");
    expect(URLImpl.path(mockLocation, "other")).toEqual(null);

    mockLocation.pathname = "/foo/12///bar/34/test";
    expect(URLImpl.path(mockLocation, "foo")).toEqual("12");
    expect(URLImpl.path(mockLocation, "12")).toEqual(null);
    expect(URLImpl.path(mockLocation, "bar")).toEqual("34");
    expect(URLImpl.path(mockLocation, "34")).toEqual(null);
    expect(URLImpl.path(mockLocation, "test")).toEqual("");
    expect(URLImpl.path(mockLocation, "other")).toEqual(null);

    mockLocation.pathname = "/";
    expect(URLImpl.path(mockLocation, "")).toEqual(null);
    expect(URLImpl.path(mockLocation, "any")).toEqual(null);

    mockLocation.pathname = "/test";
    expect(URLImpl.path(mockLocation, "test")).toEqual("");
    expect(URLImpl.path(mockLocation, "any")).toEqual(null);
});

test("startWithPath", () => {
    mockLocation.pathname = "/reg";
    expect(URLImpl.startWithPath(mockLocation, "reg")).toEqual(true);
    expect(URLImpl.startWithPath(mockLocation, "re")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "REG")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "reg2")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "other")).toEqual(false);

    mockLocation.pathname = "/reg/123456";
    expect(URLImpl.startWithPath(mockLocation, "reg")).toEqual(true);
    expect(URLImpl.startWithPath(mockLocation, "re")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "REG")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "reg2")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "other")).toEqual(false);

    mockLocation.pathname = "/reg/";
    expect(URLImpl.startWithPath(mockLocation, "reg")).toEqual(true);
    expect(URLImpl.startWithPath(mockLocation, "re")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "REG")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "reg2")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "other")).toEqual(false);

    mockLocation.pathname = "/test/reg/";
    expect(URLImpl.startWithPath(mockLocation, "reg")).toEqual(false);
    expect(URLImpl.startWithPath(mockLocation, "test")).toEqual(true);
    expect(URLImpl.startWithPath(mockLocation, "test/reg")).toEqual(true);
    expect(URLImpl.startWithPath(mockLocation, "other")).toEqual(false);
});
