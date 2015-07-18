var edge = require('../lib/edge.js'), assert = require('assert')
    , path = require('path');

var edgeTestDll = path.join(__dirname, 'Edge.Tests.dll');

describe('edge-cs', function () {

    it('succeeds with literal lambda', function (done) {
        var func = edge.func('async (input) => { return "Hello, " + input.ToString(); }');
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with csx file with lambda', function (done) {
        var func = edge.func(path.join(__dirname, 'hello_lambda.csx'));
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with lambda in function', function (done) {
        var func = edge.func(function () {/* async (input) => { return "Hello, " + input.ToString(); } */});
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with literal class', function (done) {
        var func = edge.func('using System.Threading.Tasks; public class Startup { ' +
            ' public async Task<object> Invoke(object input) { return "Hello, " + input.ToString(); } }');
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with csx file with class', function (done) {
        var func = edge.func(path.join(__dirname, 'hello_class.csx'));
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with cs file with class', function (done) {
        var func = edge.func(path.join(__dirname, 'hello_class.cs'));
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with class in function', function (done) {
        var func = edge.func(function () {/* 
            using System.Threading.Tasks;

            public class Startup 
            {
                public async Task<object> Invoke(object input) 
                {
                    return "Hello, " + input.ToString();
                }
            }
        */});
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with custom class and method name', function (done) {
        var func = edge.func({
            source: function () {/* 
                using System.Threading.Tasks;

                namespace Foo 
                {
                    public class Bar 
                    {
                        public async Task<object> InvokeMe(object input) 
                        {
                            return "Hello, " + input.ToString();
                        }
                    }
                }           
            */},
            typeName: 'Foo.Bar',
            methodName: 'InvokeMe'
        });
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('fails with malformed literal lambda', function () {
        var jpCs1525Hex = 'e381afe784a1e58ab9e381a7e38199e38082'

        var errMsgRegExp = new RegExp(
                "Invalid expression term '=>'|Unexpected symbol `=>'"
                + "|" + "'=>' " + (new Buffer(jpCs1525Hex, 'hex')).toString()
            )
    
        assert.throws(
            function () { edge.func('async_foo (input) => { return "Hello, " + input.ToString(); }'); },
            function (error) {
                if ((error instanceof Error) && error.message.match(errMsgRegExp)) {
                    return true;
                }
                return false;
            },
            'Unexpected result'
        );
    });

    it('fails with malformed class in function', function () {
        var jpCs1518Hex = 'e382afe383a9e382b9e38081e38387e383aae382b2e383bce38388e38081e58897e68c99e59'
                        + 'e8be38081e382a4e383b3e382bfe383bce38395e382a7e382a4e382b920e381bee3819fe381af'
                        + 'e6a78be980a0e4bd93e3818ce5bf85e8a681e381a7e38199e38082'

        var errMsgRegExp = new RegExp(
                "Expected class, delegate, enum, interface, or|expecting `class', `delegate', `enum', `interface', `partial', or `struct'"
                + "|" + (new Buffer(jpCs1518Hex, 'hex')).toString()
            )

        assert.throws(
            function () {
                edge.func(function () {/* 
                    using System.Threading.Tasks;

                    public classes Startup 
                    {
                        public async Task<object> Invoke(object input) 
                        {
                            return "Hello, " + input.ToString();
                        }
                    }
                */});
            },
            function (error) {
                if ((error instanceof Error) && error.message.match(errMsgRegExp)) {
                    return true;
                }
                return false;
            },
            'Unexpected result'
        );
    });

    it('fails when Invoke method is missing', function () {
        assert.throws(
            function () {
                edge.func(function () {/* 
                    using System.Threading.Tasks;

                    public class Startup 
                    {
                        public async Task<object> Invoke_Foo(object input) 
                        {
                            return "Hello, " + input.ToString();
                        }
                    }
                */});
             },
            function (error) {
                if ((error instanceof Error) && error.message.match(/Unable to access CLR method to wrap through reflection/)) {
                    return true;
                }
                return false;
            },
            'Unexpected result'
        );
    });

    it('fails when Startup class is missing', function () {
        var jpPartBufferPre = new Buffer('e59e8b','hex');
        var jpPartBufferSuf = new Buffer('e38292e8aaade381bfe8bebce38281e381bee3819be38293e381a7e38197e3819fe38082','hex');
        var errMsgRegExp = new RegExp(
                "Could not load type 'Startup'"
                + "|" + jpPartBufferPre.toString() + " 'Startup' " + jpPartBufferSuf.toString()
            );
    
        assert.throws(
            function () {
                edge.func(function () {/* 
                    using System.Threading.Tasks;

                    public class Startup_Bar
                    {
                        public async Task<object> Invoke(object input) 
                        {
                            return "Hello, " + input.ToString();
                        }
                    }           
                */});
            },
            function(error) {
                if ( (error instanceof Error) && error.message.match(errMsgRegExp)) {
                    return true;
                }
                return false;
            },
            'Unexpected result'
        );
    });

    it('succeeds with System.Data.dll reference as comment in class', function (done) {
        var func = edge.func({
            source: function () {/* 
                //#r "System.Data.dll"

                using System.Threading.Tasks;
                using System.Data;

                public class Startup 
                {
                    public async Task<object> Invoke(object input) 
                    {
                        return "Hello, " + input.ToString();
                    }
                }           
            */}
        });
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with System.Data.dll reference without comment in class', function (done) {
        var func = edge.func({
            source: function () {/* 
                #r "System.Data.dll"

                using System.Threading.Tasks;
                using System.Data;

                public class Startup 
                {
                    public async Task<object> Invoke(object input) 
                    {
                        return "Hello, " + input.ToString();
                    }
                }           
            */}
        });
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });    

    it('succeeds with System.Data.dll reference as comment in async lambda', function (done) {
        var func = edge.func({
            source: function () {/* 
                //#r "System.Data.dll"
                
                async (input) => 
                {
                    return "Hello, " + input.ToString();
                }
            */}
        });
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with System.Data.dll reference without comment in async lambda', function (done) {
        var func = edge.func({
            source: function () {/* 
                #r "System.Data.dll"
                
                async (input) => 
                {
                    return "Hello, " + input.ToString();
                }
            */}
        });
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Hello, JavaScript');
            done();
        });
    });

    it('succeeds with System.Data.dll reference and a using statement in async lambda', function (done) {
        var func = edge.func({
            source: function () {/* 
                #r "System.Data.dll"

                using System.Data;
                
                async (input) => 
                {
                    return input.ToString() + " is " + SqlDbType.Real.ToString();
                }
            */}
        });
        func("JavaScript", function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'JavaScript is Real');
            done();
        });
    });

    it('succeeds with dynamic input to async lambda', function (done) {
        var func = edge.func({
            source: function () {/* 
                async (dynamic input) => 
                {
                    return input.text + " works";
                }
            */}
        });
        func({ text: 'Dynamic' }, function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Dynamic works');
            done();
        });
    });

    it('succeeds with nested dynamic input to async lambda', function (done) {
        var func = edge.func({
            source: function () {/* 
                async (dynamic input) => 
                {
                    return input.nested.text + " works";
                }
            */}
        });
        func({ nested: { text: 'Dynamic' } }, function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Dynamic works');
            done();
        });
    });

    it('succeeds with dynamic input to Invoke method', function (done) {
        var func = edge.func({
            source: function () {/* 
                using System.Threading.Tasks;

                public class Startup 
                {
                    public async Task<object> Invoke(dynamic input) 
                    {
                        return input.text + " works";
                    }
                }    
            */}
        });
        func({ text: 'Dynamic' }, function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Dynamic works');
            done();
        });
    });    

    it('succeeds with nested dynamic input to Invoke method', function (done) {
        var func = edge.func({
            source: function () {/* 
                using System.Threading.Tasks;

                public class Startup 
                {
                    public async Task<object> Invoke(dynamic input) 
                    {
                        return input.nested.text + " works";
                    }
                }    
            */}
        });
        func({ nested: { text: 'Dynamic' } }, function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Dynamic works');
            done();
        });
    }); 

    it('succeeds with dictionary input to Invoke method', function (done) {
        var func = edge.func({
            source: function () {/* 
                using System.Threading.Tasks;
                using System.Collections.Generic;

                public class Startup 
                {
                    public async Task<object> Invoke(IDictionary<string,object> input) 
                    {
                        return ((IDictionary<string,object>)input["nested"])["text"] + " works";
                    }
                }    
            */}
        });
        func({ nested: { text: 'Dictionary' } }, function (error, result) {
            assert.ifError(error);
            assert.equal(result, 'Dictionary works');
            done();
        });
    });    
});
