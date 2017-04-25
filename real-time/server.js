"use strict";

/**********************************************************/
/*                      Librerías                         */
/**********************************************************/
var express     = require("express"),
    app         = express(),
    http        = require("http"),
    https       = require("https"),
    zlib        = require("zlib"),
    httpio      = http.createServer(app),

    net         = require('net'),
    JsonSocket  = require('json-socket'),

    _           = require("underscore"),
    fn          = require("./functions.js"),
    fs          = require('fs'),
    jsonfile    = require('jsonfile'),
    Q           = require("q"),
    log4js      = require('log4js'),
    dateFormat  = require('dateformat');

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var marca       = require("./marca.js"),
    titanbet    = require("./titanbet.js"),
    williamhill = require("./williamHill.js"),
    interwetten = require("./interwetten.js"),
    goldenpark  = require("./goldenpark.js"),
    kambi       = require("./kambi.js"),
    marathonbet = require("./marathonbet.js"),
    pinnacle    = require("./pinnacle.js"),
    luckia      = require("./luckia.js"),
    paf         = require("./paf.js"),
    //betfair   = require("./betfair.js"),
    f_feeds     = "./feeds.js",
    feeds       = fn._readFile( f_feeds );

/**********************************************************/
/*                       LOGS                             */
/**********************************************************/
log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/server.log', category: 'server' }
  ]
});

var logger = log4js.getLogger('SERVER');

/**********************************************************/
/*                      EXPRESS                           */
/**********************************************************/
var port = process.env.PORT || 80,
    publicDir = express.static(__dirname + "/static"),
    connData = [],
    activeCtrlRoom = [],
    exit = [];

/* Config */
app.use(publicDir);             // Configuramos la ruta publica
app.disable('x-powered-by');    // Quitamos la etiqueta de las cabeceras
/* Incio del servidor http */
httpio.listen( port, () =>
{
    logger.debug("Iniciando Express en el puerto %d", port);
});
/* Página principal */
app.get("/", (req, res) =>
{
    res.send('<html/>');
    res.end();
    //res.sendFile(publicDir + "/index.html");
});
/* Guardamos archivos de diccionarios */
app.post("/dictionary/:name", (req, res) =>
{
    var body = '',
        filePath = __dirname + '/dictionary/' + req.params.name;

    req.on('data', (data) =>
    {
        body += data;
    });

    req.on('end', () =>
    {
        fs.writeFile( filePath, body, 'utf8', () => 
        {
            console.log(filePath);
            res.end();
        });
    });
});
/* Vigilamos los archivos de diccionarios */
fs.watch( f_feeds, (curr, prev) => 
{
    feeds = fn._readFile( f_feeds );
});

/**********************************************************/
/*                    TCP SERVER                          */
/**********************************************************/
var server = net.createServer(),
    lastMSG = null;

server.listen( 9838 );
server.on('connection', ( socketClient ) =>
{
    var socket = new JsonSocket( socketClient ),
        statusFeed = {
            emptyData: [],
            errorData: []
        };

    function calls()
    {
        return Q.all(_.map( feeds, ( feed ) =>
        {
            var deferred = Q.defer();

            callXML( feed )
                .then( (token) =>
                {
                    try
                    {
                        logger.trace( "Finish: %s", JSON.stringify(token) );
                        /* Enviamos los datos */
                        if( token.data && token.data.length > 0 )
                            socket.sendMessage( { type: 'ping', data: token } );
                        else
                        {
                            //console.log( "Type: " + token.type );

                            switch ( token.type )
                            {
                                case "error":
                                    statusFeed.errorData.push( token.id_feed );
                                break;
                                case "timeout":
                                    statusFeed.errorData.push( token.id_feed );
                                break;
                                default:
                                    statusFeed.emptyData.push( token.feedID );
                                break;
                            }
                        }
                    }
                    catch( e )
                    {
                        logger.fatal( e );
                    }
                    finally 
                    {
                        deferred.resolve();
                    }
                });

            return deferred.promise;
        }) );
    }

    socket.on('message', (message) =>
    {
        try
        {
            /* Para errores en el cliente */
            if( message.success == false )
            {
                logger.fatal( "[Command Error]");
                logger.fatal( message.error );
                server.close();
                server.listen( 9838 );
                socket.end();
            }
            else
            {
                switch (message.command)
                {
                    case 'start':
                        logger.trace("[Command Start]");
                        calls()
                        .then(function()
                        {
                            socket.sendMessage({type: 'start', statusFeed: statusFeed });
                            /* Inicializamos los valores */
                            statusFeed = {
                                emptyData: [],
                                errorData: []
                            };
                        })
                        .fail( function()
                        {
                           logger.fatal("fail in calls");
                        });
                    break;
                    case 'ping':
                        logger.trace("[Command Ping]");
                    break;
                    case 'restart':
                        logger.trace("[Command Restart]");
                    break;
                }
            }
        }
        catch(e)
        {
            socket.sendMessage({type: 'error', error: "Ocurrio un error inexperado[002]"});
        }
    });

    socket.on('error', (err) =>
    {
        logger.error( err );
        logger.trace("[Command Restart]");
        socket.sendMessage({type:'error', error: err.men});
    });

    socket.on('end', () =>
    {
        logger.error("El cliente dejo de conectarse");
    });
});

/**********************************************************/
/*                    FEEDS DATA                          */
/**********************************************************/
function callXML( feed )
{
    var defer = Q.defer(),
        ncall = 0;

    function getJSON( feed )
    {
        var deferFeed   = Q.defer(),
            req         = (feed.protocol == "http:")
                            ? http.request( feed, getCallRequest )
                            : https.request( feed, getCallRequest );

        function getCallRequest( res )
        {   
            var buffer = [];

            if( res.headers['content-encoding'] == 'gzip' )
            {
                var gunzip = zlib.createGunzip();            
                res.pipe(gunzip);

                gunzip.on('data', function(chunk) 
                {
                    buffer.push(chunk.toString());
                })
                .on("end", function() 
                {
                    buffer = buffer.join("");

                    switch( res.socket._host ) 
                    {
                        /* Luckia */
                        case 'luckiaxml.sbtech.com' :
                            luckia.parser( buffer )
                                .then( ( result ) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                    };
                });
            }
            else
            {
                res.on('data', (chunk) =>
                {
                    buffer.push(chunk.toString());
                });

                res.on('end', () =>
                {
                    buffer = buffer.join("");

                    switch( res.socket._host ) 
                    {
                        /* Marca Apuestas */
                        case 'genfeeds.marcaapuestas.es' :
                            marca.parser(buffer)
                                .then( (result) => deferFeed.resolve( result ) )
                                .fail( (err) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* titanBet */
                        case 'feedsgen.titanbet.com' :
                            titanbet.parser(buffer)
                                .then( (result) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* kambi */
                        case 'e3-api.kambi.com' :
                            try
                            {
                                kambi.parser( JSON.parse(buffer) )
                                    .then( (result) => deferFeed.resolve( result ) )
                                    .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                            }
                            catch( e )
                            {
                                return deferFeed.reject( { type: 'error', men: 'Varnish cache server', feed: feed.name, id_feed: feed.id } );
                            }
                        break;
                        /* PAF */
                        case 'www.paf.es' :
                            paf.parser( buffer )
                                .then( (result) => deferFeed.resolve( result ) )
                                .fail( (err) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* William Hill */
                        case 'cachepricefeeds.williamhill.com' :
                            williamhill.parser( buffer )
                                .then( (result) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* Interwetten */
                        case 'ad.interwetten.com' :
                            interwetten.parser( buffer )
                                .then( ( result ) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* Goldenpark */
                        case 'livebetting.goldenpark.es' :
                            goldenpark.parser( buffer )
                                .then( ( result ) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* MarathonBet */
                        case 'livefeeds.marathonbet.com' :
                            marathonbet.parser( buffer )
                                .then( ( result ) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                        /* Pinnacle */
                        case 'api.pinnacle.com' :
                            pinnacle.parser( JSON.parse(buffer) )
                                .then( ( result ) => deferFeed.resolve( result ) )
                                .fail( ( err ) => deferFeed.reject( { type: 'error', men: err, feed: feed.name, id_feed: feed.id } ) );
                        break;
                    }
                });
            }
        };
        /* Terminamos la llamada */
        req.end();
        /* La llamada provoca un error */
        req.on('error', (e) =>
        {
            logger.fatal( 'problem with request: %s', e.message );

            return deferFeed.reject( { type: 'error', men: 'problem with request: ' + e.message, feed: feed.name, id_feed: feed.id } );
        });
        /* El feed no responde en 5s */
        req.setTimeout(10000, () =>
        {
            logger.fatal( 'Timeout in: %s', feed.name );

            return deferFeed.reject( { type: 'timeout', feed: feed.name, id_feed: feed.id } );
        });
        /* Devolvemos la promesa */
        return deferFeed.promise;
    };

    getJSON( feed )
        .then( (result) => 
        {
            //console.log("Resultado: %s", JSON.stringify(result) );
            return defer.resolve( result );
        })
        .fail( (e) => 
        {
            logger.fatal( "Resultado Error: %s", JSON.stringify(e) );

            switch ( e.type )
            {
                case "error" :
                    defer.resolve( { type: "error", men : e.men, feed: e.feed, id_feed: e.id_feed } );
                break;
                case "timeout" :
                    defer.resolve( { type: "timeout", men : "el feed: " + e.feed + " no respondio...", feed: e.feed, id_feed: e.id_feed } );
                break;
            }
        });


    return defer.promise;
};

//sudo pm2 start server.js --merge-logs --log-date-format="YYYY-MM-DD HH:mm Z" --output /home/ec2-user/real-time/logs/output.log --error /home/ec2-user/real-time/logs/error.log
