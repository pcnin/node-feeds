"use strict";

var fs = require("fs"),

_getByName = module.exports._getByName = function(collection, name, cb)
{
    var coll = collection.slice( 0 );

    (function _loop( data ) 
    {
        //console.log( data.name + " == " + name);

        if( data.name === name )
            cb.apply( null, [ data ] );
        else if( coll.length )
            setTimeout( _loop.bind( null, coll.shift() ), 25 );

    }( coll.shift() ));

    //console.log("no se encuentra");
},

_readFile = module.exports._readFile = function( filename )
{
    return eval( fs.readFileSync( filename, 'utf8') );
},

_order = module.exports._order = function( property )
{
    var sortOrder = 1;

    if(property[0] === "-") 
    {
        sortOrder = -1;
        property = property.substr(1);
    }

    return function (a,b) 
    {
        var result = (a[property] < b[property]) ? -1 : (a[property] > b[property]) ? 1 : 0;        
        return result * sortOrder;
    }

},

_replaceName = module.exports._replaceName = function( event )
{
    return event.toLowerCase()
                .replace(/[áàäâå]/g, 'a')
                .replace(/[éèëê]/g, 'e')
                .replace(/[íìïî]/g, 'i')
                .replace(/[óòöô]/g, 'o')
                .replace(/[úùüû]/g, 'u')
                .replace(/[ýÿ]/g, 'y')
                .replace(/[ñ]/g, 'n')
                .replace(/[ç]/g, 'c')
                .replace(/['"]/g, '')
                .replace(/\//g, "")
                .replace(/ /g, '-');
},

_orderOdds = module.exports._orderOdds = function()
{
    var feedOrder = [ 7, 10, 1, 13, 6, 2, 5, 3, 4, 8, 9, 12 ],
        orderFeed = function( a, b )
        {
            return ( feedOrder.indexOf( a ) < feedOrder.indexOf( b ) ) ? -1 :
                   ( feedOrder.indexOf( a ) > feedOrder.indexOf( b ) ) ? 1 : 0;
        };

    return function( a, b )
    {
        return ( a['n_odd'] < b['n_odd'] ) ? 1 : 
               ( a['n_odd'] > b['n_odd'] ) ? -1 : 
               orderFeed( a['id_feed'], b['id_feed'] );
    }
};