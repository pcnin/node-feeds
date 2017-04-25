var http    = require("http"),
    zlib    = require("zlib"),
    luckia  = require("./luckia");

var options = [{
        /* Interwetten */
        id: 5,
        name: 'interwetten',
        host: 'ad.interwetten.com',
        protocol: 'http:',
        port: 80,
        path: '/ticker_temp/offer.asmx/GetLiveEventList?LanguageID=ES&Filter='
    },
    {
        /* Luckia */
        id: 17,
        name: 'luckia',
        host: 'luckiaxml.sbtech.com',
        protocol: 'http:',
        port: 80,
        headers: { 
            'accept-encoding': 'gzip,deflate' 
        },
        path: '/livelines.aspx?OddsStyle=DECIMAL'
    }];

function getGzipped(options, callback) 
{
    // buffer to store the streamed decompression
    var buffer = [];

    var req = http.request(options, callfunct);

    function callfunct(res) 
    {
        if( res.headers['content-encoding'] == 'gzip' )
        {
            var gunzip = zlib.createGunzip();            
            res.pipe(gunzip);

            gunzip.on('data', function(data) {
                // decompression chunk ready, add it to the buffer
                buffer.push(data.toString());

            }).on("end", function() {
                // response and decompression complete, join the buffer and return
                callback(null, buffer.join("")); 

            }).on("error", function(e) {
                callback(e);
            });
        }
        else
        {
            res.on('data', (chunk) =>
            {
                buffer.push(chunk.toString());
            })
            .on('end', () =>
            {   
                callback(null, buffer.join("")); 
            });
        }
    };

    /* Terminamos la llamada */
    req.end();

    req.on('error', function(e) 
    {
        callback(e);
    });

    req.setTimeout(15000, () =>
    {
        console.log('timeout');

        callback(null, 'terminado...');
    });
};

getGzipped(options[1], function(err, data) 
{
    luckia.parser( data )
        .then( ( result ) => console.log( result ) )
        .fail( ( err ) => console.log( err ) );
});