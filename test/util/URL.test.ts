import {URLUtilWithLocation} from "util/URLUtil";

const mockLocation: Location = {
    host: "127.0.0.1",
    search: "",
    pathname: "/",
    hash: "",
} as Location;
function setLocationQueryString(value: string) {
    mockLocation.search = value;
}
function setLocationPath(value: string) {
    mockLocation.pathname = value;
}

test("parseQueryString", () => {
    setLocationQueryString("?test=foo%20bar");
    expect(URLUtilWithLocation.parseQueryString(mockLocation)).toEqual({
        test: "foo bar",
    });

    setLocationQueryString("?page=10&pageSize=30&showOldItem&name=abc");
    expect(URLUtilWithLocation.parseQueryString(mockLocation)).toEqual({
        page: "10",
        pageSize: "30",
        showOldItem: "",
        name: "abc",
    });

    setLocationQueryString("");
    expect(URLUtilWithLocation.parseQueryString(mockLocation)).toEqual({});
});

test("parsePath", () => {
    setLocationPath("/foo/12/bar/34/test/");
    expect(URLUtilWithLocation.parsePath(mockLocation, "foo")).toEqual("12");
    expect(URLUtilWithLocation.parsePath(mockLocation, "12")).toEqual(null);
    expect(URLUtilWithLocation.parsePath(mockLocation, "bar")).toEqual("34");
    expect(URLUtilWithLocation.parsePath(mockLocation, "34")).toEqual(null);
    expect(URLUtilWithLocation.parsePath(mockLocation, "test")).toEqual("");
    expect(URLUtilWithLocation.parsePath(mockLocation, "other")).toEqual(null);

    setLocationPath("/foo/12///bar/34/test");
    expect(URLUtilWithLocation.parsePath(mockLocation, "foo")).toEqual("12");
    expect(URLUtilWithLocation.parsePath(mockLocation, "12")).toEqual(null);
    expect(URLUtilWithLocation.parsePath(mockLocation, "bar")).toEqual("34");
    expect(URLUtilWithLocation.parsePath(mockLocation, "34")).toEqual(null);
    expect(URLUtilWithLocation.parsePath(mockLocation, "test")).toEqual("");
    expect(URLUtilWithLocation.parsePath(mockLocation, "other")).toEqual(null);

    setLocationPath("/");
    expect(URLUtilWithLocation.parsePath(mockLocation, "")).toEqual(null);
    expect(URLUtilWithLocation.parsePath(mockLocation, "any")).toEqual(null);

    setLocationPath("/test");
    expect(URLUtilWithLocation.parsePath(mockLocation, "test")).toEqual("");
    expect(URLUtilWithLocation.parsePath(mockLocation, "any")).toEqual(null);
});

test("startWithPath", () => {
    setLocationPath("/reg");
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg")).toEqual(true);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "re")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "REG")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg2")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "other")).toEqual(false);

    setLocationPath("/reg/123456");
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg")).toEqual(true);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "re")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "REG")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg2")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "other")).toEqual(false);

    setLocationPath("/reg/");
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg")).toEqual(true);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "re")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "REG")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg2")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "other")).toEqual(false);

    setLocationPath("/test/reg/");
    expect(URLUtilWithLocation.startWithPath(mockLocation, "reg")).toEqual(false);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "test")).toEqual(true);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "test/reg")).toEqual(true);
    expect(URLUtilWithLocation.startWithPath(mockLocation, "other")).toEqual(false);
});
