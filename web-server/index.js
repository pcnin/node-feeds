"use strict";

/**********************************************************/
/*                         INIT                           */
/**********************************************************/
var express         = require("express"),
    app             = express(),
    http            = require('http').Server(app),
    io              = require('socket.io')(http),
    net             = require('net'),
    JsonSocket      = require('json-socket'),
    fs              = require('fs'),
    fn              = require("./functions.js"),
    _               = require("underscore"),
    Q               = require("q"),
    log4js          = require('log4js'),
    exit            = [],
    activeRoom      = [],
    activeCtrlRoom  = [],
    auxData         = [],
    dataList        = [];

/**********************************************************/
/*                    SETTING && VARS                     */
/**********************************************************/
//logger.setLevel('ERROR');
 
// logger.trace('mensajes del servidor');
// logger.debug('comunicación con el servidor de rt');
// logger.info('entrada en un canal');
// logger.warn('salida de un canal');
// logger.error('errores');
// logger.fatal('errores fatales');

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/server.log', category: 'server' }
  ]
});

var port = process.env.PORT || 8080,
    publicDir = express.static(__dirname + "/static"),
    logger = log4js.getLogger('SERVER');
/**********************************************************/
/*                   NET JSON SOCKET                      */
/**********************************************************/
var initServer = function()
{
    /* Settings */
    var net_port = 9838,
    host = 'rt.besgam.com', //52.36.40.180,
    timer,
    timeout = timeout || 60000,
    jSocket = new JsonSocket( new net.Socket() );
    /* Conectamos */
    jSocket.connect( net_port, host );

    /* Eventos */
    jSocket.on('connect', function() 
    {
        logger.trace("[CONNECTION] Connect!")
        jSocket.sendMessage({command:'start'});
        jSocket.on('message', function(message) 
        {
            try
            {
                /* Reiniciamos el timeout */
                clearTimeout(timer);
                /* Heartbeat */
                timer = setTimeout(function() 
                {
                    jSocket.sendError("[ERROR] Attempt at connection exceeded timeout value");
                    logger.fatal("[ERROR] Attempt at connection exceeded timeout value");
                }, timeout);

                switch (message.type)
                {
                    case 'start' :
                        logger.debug( "----------------------------------------------------------------------");
                        logger.info("status: " + JSON.stringify(message.statusFeed) );

                        /* Reducimos la información de las casas vacias */
                        exit = reduceEmpty( exit, message.statusFeed.emptyData );
                        /* Reiniciamos los canales */
                        activeCtrlRoom = [];
                        /* Creamos la copia */
                        auxData = exit;

                        /* Emitimos los mensajes */
                        if( typeof( io.sockets.adapter.rooms[ "list-data-live" ] ) != 'undefined' )
                        {
                            dataList = [];

                            _.each( auxData, function( data )
                            {
                                var markets = _.filter( data.markets, function( market )
                                {
                                    if( market.id == 1 || market.id == 7 )
                                        return market;
                                });

                                dataList.push({
                                    sportID : data.sportID,
                                    sport   : data.sport,
                                    info    : data.info,
                                    league  : data.league,
                                    event   : data.event,
                                    markets : markets
                                })
                            });

                            /* Emitimos la información de la lista */
                            io.sockets.in( "list-data-live" ).emit('message', dataList );

                            if( typeof io.sockets.adapter.rooms[ "list-data-live" ] != "undefined")
                                activeCtrlRoom.push( { name: "list-data-live", len: io.sockets.adapter.rooms[ "list-data-live" ].length } );

                            //logger.trace( "Finish: %s", JSON.stringify(dataList) );
                        }

                        for( var nCont = 0, len = auxData.length;
                             nCont < len;
                             nCont++ )
                        {
                            var name_event = fn._replaceName(auxData[ nCont ].event),
                                name_file  = './temp/' + name_event + '.txt',
                                time = Date.now(),
                                fstr = "",
                                score = (function( data )
                                {
                                    if( data.info.score != null )
                                    {
                                        if( data.sportID != 3 )
                                            return data.info.score.replace(/ /g, '');
                                        else
                                            return data.info.score.replace(/ /g, '') + " ( " + data.info.set + " )";
                                    }
                                    else
                                        return '';

                                })( auxData[ nCont ] ),
                                dataAll = auxData[ nCont ].markets;

                            _.each( dataAll, function( market )
                            {
                                var bet = "";
                                _.each( market.bets, function( b )
                                {
                                    bet += b.data[0].n_odd + ",";
                                });

                                fstr += market.id + "$" + bet + "|";
                            });

                            fstr = time + "|" + score + "|" + fstr;

                            //fs.appendFile(name_file, fstr + "\n" );

                            try
                            {
                                var stats = fs.statSync( name_file ),
                                    mtime = new Date(stats.mtime),
                                    now   = new Date(),
                                    diff  = now - mtime;

                                if( diff >= 60000 )
                                    fs.appendFile(name_file, fstr + "\n" );
                            }
                            catch( e )
                            {
                                fs.appendFile(name_file, fstr + "\n" );
                            }

                            //io.emit( name_event, connData[nCont] );
                            if( typeof( io.sockets.adapter.rooms[ name_event ] ) != 'undefined' )
                            {
                                io.sockets.in( name_event ).emit('message', auxData[nCont] );
                                activeCtrlRoom.push( { name: name_event, len: io.sockets.adapter.rooms[ name_event ].length } );
                            }
                        }

                        // console.log( io.sockets.adapter.rooms );

                        /* Desconectamos las salas inactivas */
                        _.map( io.sockets.adapter.rooms, function( value, key )
                        {
                            var actives = _.find( activeCtrlRoom, function( room )
                            {
                                if( room.name == key ) return room.name;
                            });

                            // console.log( key );
                            // console.log( typeof key );
                            // console.log( actives );

                            if( actives == undefined && typeof key == 'string' )
                            {
                                //console.log("Emit: leave-room in %s", key);
                                io.sockets.in( key ).emit( 'leave-room' );
                            }
                        });

                        logger.debug( "Active events: %s", auxData.length );
                        logger.debug( "Active rooms: %s", JSON.stringify(activeCtrlRoom) );

                        activeRoom = activeCtrlRoom;
                        jSocket.sendMessage({command:'start'});
                        
                    break;
                    case 'ping' :
                        logger.info( message.data.feed + "--" + message.data.data.length );

                        gatherData( message.data )
                        .then( function()
                        {
                            return cleanInfoData( message.data );
                        })
                        .then( function()
                        {
                            jSocket.sendMessage({command:'ping'});
                        });

                    break;
                    case 'error' :
                        logger.error( message );
                    break;

                }
                
                // if( message.type == 'ping' )
                // {
                //     clearTimeout(timer);
                //     /* heartbeat */
                //     timer = setTimeout(function() 
                //     {
                //         //jSocket.end();
                //         //console.log(jSocket.isClosed());
                //         jSocket.sendError("[ERROR] Attempt at connection exceeded timeout value");
                //         logger.fatal("[ERROR] Attempt at connection exceeded timeout value");

                //         // if( !jSocket.isClosed() )
                //         // {
                //         //     logger.fatal("[FATAL] Socket is Closed");

                //         //     jSocket.sendEndError("SOCKETCLOSE", function()
                //         //     {
                //         //         jSocket = initServer();
                //         //     });
                //         // }
                //         // else
                //         //     jSocket.sendMessage({command:'restart'});

                //     }, timeout);

                //     /* Reiniciamos */
                //     activeCtrlRoom = [];
                //     /* Creamos la copia */
                //     auxData = message.data;

                //     logger.debug( 'Response message, %s events', auxData.length );

                //     /* Emitimos los mensajes */
                //     //io.emit( "list-data-live", connData );
                //     if( typeof( io.sockets.adapter.rooms[ "list-data-live" ] ) != 'undefined' )
                //     {
                //         io.sockets.in( "list-data-live" ).emit('message', auxData );
                //         activeCtrlRoom.push( { name: "list-data-live", len: io.sockets.adapter.rooms[ "list-data-live" ].length } );
                //     }

                //     for( var nCont = 0, len = auxData.length;
                //          nCont < len;
                //          nCont++ )
                //     {
                //         var name_event = fn._replaceName(auxData[ nCont ].event),
                //             name_file  = './temp/' + name_event + '.txt',
                //             time = Date.now(),
                //             fstr = "",
                //             score = (function( data )
                //             {
                //                 if( data.info.score != null )
                //                 {
                //                     if( data.sportID != 3 )
                //                         return data.info.score.replace(/ /g, '');
                //                     else
                //                         return data.info.score.replace(/ /g, '') + " ( " + data.info.set + " )";
                //                 }
                //                 else
                //                     return '';

                //             })( auxData[ nCont ] ),
                //             dataAll = auxData[ nCont ].markets;

                //         _.each( dataAll, function( market )
                //         {
                //             var bet = "";
                //             _.each( market.bets, function( b )
                //             {
                //                 bet += b.data[0].n_odd + ",";
                //             });

                //             fstr += market.id + "$" + bet + "|";
                //         });

                //         fstr = time + "|" + score + "|" + fstr;

                //         //fs.appendFile(name_file, fstr + "\n" );

                //         try
                //         {
                //             var stats = fs.statSync( name_file ),
                //                 mtime = new Date(stats.mtime),
                //                 now   = new Date(),
                //                 diff  = now - mtime;

                //             if( diff >= 60000 )
                //                 fs.appendFile(name_file, fstr + "\n" );
                //         }
                //         catch( e )
                //         {
                //             fs.appendFile(name_file, fstr + "\n" );
                //         }

                //         //io.emit( name_event, connData[nCont] );
                //         if( typeof( io.sockets.adapter.rooms[ name_event ] ) != 'undefined' )
                //         {
                //             io.sockets.in( name_event ).emit('message', auxData[nCont] );
                //             activeCtrlRoom.push( { name: name_event, len: io.sockets.adapter.rooms[ name_event ].length } );
                //         }
                //     }

                //     /* Desconectamos las salas inactivas */
                //     _.map( io.sockets.adapter.rooms, function( value, key )
                //     {
                //         var actives = _.find( activeCtrlRoom, function( room )
                //         {
                //             if( room.name == key ) return room.name;
                //         });

                //         if( actives == undefined && key.charAt(0) != '/' )
                //             io.sockets.in( key ).emit( 'leave-room' );
                //     });

                //     logger.debug("Active rooms: %s", JSON.stringify(activeCtrlRoom) );

                //     jSocket.sendMessage({command:'ping'});

                //     // if( activeCtrlRoom.length > 0 )
                //     //     jSocket.sendMessage({command:'ping'});
                //     // else
                //     //     jSocket.sendMessage({command:'stop'});

                //     activeRoom = activeCtrlRoom;
                // }
                // else if( message.type == 'error' )
                // {
                //     logger.fatal( message.error );
                // }

                //logger.trace( io.sockets.adapter.rooms );
            }
            catch( e )
            {
                logger.fatal( e );
                //jSocket.sendMessage({command:'start'});
            }
        });

        jSocket.on('error', function(err) 
        {
            switch( err.code )
            {
                case "ENOTFOUND":
                    logger.fatal( "[ERROR ENOTFOUND] No device found at this address!" );
                break;
                case "ECONNREFUSED":
                    logger.fatal( "[ERROR ECONNREFUSED] Connection refused! Please check the IP." );
                break;
                case "SOCKETCLOSE":
                    logger.fatal( "[ERROR SOCKETCLOSE] Connection is Closed." );
                break;
                case "SOCKETTIMEOUT":
                    logger.fatal( "[ERROR SOCKETTIMEOUT] Attempt at connection exceeded timeout value" );
                break;
            }

            //jSocket.destroy();
            logger.fatal("[CONNECTION] Unexpected error! " + err.message + " RESTARTING SERVER");
            //jSocket.sendMessage({command:'restart'});
        });

        jSocket.on('disconnect', function() 
        {
            logger.fatal("[CONNECTION] Disconnected!");
        });

        jSocket.on('close', function()
        {
            logger.fatal("[CONNECTION] Close!");

            logger.trace("[CONNECTION] Restart!")
            jSocket = initServer();
        });

        jSocket.on('end', function() 
        {
            logger.fatal("[CONNECTION] End!");

        });
    });
}
/* Iniciamos el cliente tcp */
initServer();

function reduceEmpty( exit, emptyData )
{
    /* Buscamos Paf para poner las otras de Kambi */
    if( _.indexOf( emptyData, 2) != -1 )
        emptyData = emptyData.concat([9,12]);

    return  _.filter( exit, function(data)
            {
                /* Filtramos mercados */
                data.markets = _.filter( data.markets, function( market )
                {   
                    /* Filtramos apuestas */
                    market.bets = _.filter( market.bets, function( bet )
                    {
                        /* Filtramos casas de apuestas */
                        bet.data = _.filter( bet.data, function( dataBet )
                        {
                            /* Si no es una de las casas que tenemos que limpiar, */
                            /* devolvemos sus datos directament */
                            if( _.indexOf( emptyData, dataBet.id_feed) == -1 ) 
                                return dataBet;
                            else
                            {
                                /* Añadimos el vacio */
                                data.empty++;
                                /* Si nos viene una cantidad de veces vacio */
                                if( data.empty > 50 )
                                    logger.info("Eliminamos: %s de la lista de eventos, por la cantidad de veces vacio", data.event );
                                else
                                    return dataBet;
                            }
                        });
                        /* Devolvemos las casas de apuestas resultantes */
                        if( bet.data.length ) return bet;                           
                    });
                    /* Devolvemos las puestas resultantes */
                    if( market.bets.length ) return market;
                });
                /* Devolvemos los mercados resultantes */
                if( data.markets.length ) return data;
            });
};

function cleanInfoData( info )
{
    return Q.all( _.map( exit, function( comparate )
    {
        var defer = Q.defer(),
            fFind;
            
        fFind = _.find( info.data, function( data )
        {
            if( data.event.length == comparate.event.length && data.event == comparate.event )
                return true;
        });

        /* Si no nos viene el evento */
        if( fFind == undefined )
        {
            /* Añadimos el vacio */
            comparate.empty++;
            /* Si nos viene una cantidad de veces vacio */
            if( comparate.empty > 100 )
            {
                logger.info("Eliminamos: %s de la lista de eventos", comparate.event );

                /* Eliminamos el evento */
                exit = _.without(exit, _.findWhere(exit, {
                    event: comparate.event
                }));
            }

            return defer.resolve();
        }
        /* Nos viene el evento */
        else
        {
            /* NOW() */
            var now = new Date();

            /* Comprobamos el tiempo que lleva creado el evento */
            /* Si es mayor de 6h lo eliminamos, para impedir eventos perpetuos */
            if( now - comparate.create >= 21600000 )
            {
                /* Eliminamos el evento */
                exit = _.without(exit, _.findWhere(exit, {
                    event: comparate.event
                }));
            }
            else
            {
                /* Reiniciamos el contador */
                comparate.empty = 0;
            }

            return defer.resolve();
        }
            
        return defer.promise;
    }) );


};

function gatherData( info )
{
    var laps = [];

    switch( info.feedID )
    {
        case 2:
            laps.push( { "feedID": 2, "feed": "Paf", "data": info.data } );
            //laps.push( { "feedID": 7, "feed": "Luckia", "data": info.data } );
            laps.push( { "feedID": 9, "feed": "Suertia", "data": info.data } );
            laps.push( { "feedID":12, "feed": "888", "data": info.data } );
        break;
        default:
            laps.push( { "feedID": info.feedID, "feed": info.feed, "data": info.data } );
        break;
    }
        
    return Q.all( _.map( laps, function(token)
    {
        var defer = Q.defer();

        //logger.debug( "Token: %s", JSON.stringify(token) );

        var feedID = token.feedID,
            feed = token.feed;

        _.filter( token.data, function( data )
        {
            var fCompData = _.find( exit, function( comparate )
            {
                var fFind = _.find( data.participants, function( dataParticipant)
                {
                    //console.log( dataParticipant.id + " === " + comparate.participants[0].id + " || " + dataParticipant.id + " === " + comparate.participants[1].id );

                    if( _.isArray( dataParticipant.id ) && _.isArray(comparate.participants[0].id) )
                    {
                        if( _.indexOf( comparate.participants[0].id, dataParticipant.id[0] ) != -1 || _.indexOf( comparate.participants[1].id, dataParticipant.id[1] ) != -1 )
                            return dataParticipant;
                    }
                    else
                    {
                        if( dataParticipant.id === comparate.participants[0].id || dataParticipant.id === comparate.participants[1].id )
                            return dataParticipant;    
                    }
                });

                /* Si hemos encontrado el evento */
                if( fFind != undefined )
                //if( data.event.length == comparate.event.length && data.event == comparate.event )
                {
                    /* Si no tenemos nombre de liga en el evento */
                    if( comparate.league == null )
                        comparate.league = data.league;

                    // /* Información del evento */
                    // if( token.feedID == 5 )
                    // {
                    //     comparate.info = data.info;
                    //     comparate.log = data.log;
                    // }
                    // else
                    // {
                    //      Si no tenemos información del feed 5 (Interwitten) 
                    //     if( comparate.markets && comparate.markets[0].bets && _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 5 } ) == undefined )
                    //         comparate.info = data.info;
                    // }

                    /* Información del evento, ponemos su información en orden de importancia, segun la casa */
                    /* Interwetten > MarathonBet > 888 > Luckia > GoldenPark > Default */
                    switch( token.feedID )
                    {
                        /* Interwetten */
                        case 5:
                            comparate.info = data.info;
                            comparate.log = data.log;
                        break;
                        /* Luckia */
                        case 7:
                            if( comparate.markets && comparate.markets[0].bets )
                            {
                                if( _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 5 } ) == undefined &&
                                    _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 15 } ) == undefined )
                                    comparate.info = data.info;
                            }
                        break;
                        /* GoldenPark */
                        case 8:
                            if( comparate.markets && comparate.markets[0].bets )
                            {
                                if( _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 5 } ) == undefined &&
                                    _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 7 } ) == undefined &&
                                    _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 15 } ) == undefined )
                                    comparate.info = data.info;
                            }
                        break;
                        /* 888 */
                        // case 12:
                        //     if( comparate.markets && comparate.markets[0].bets )
                        //     {
                        //         if( _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 5 } ) == undefined &&
                        //             _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 15 } ) == undefined )
                        //             comparate.info = data.info;
                        //     }
                        // break;
                        /* MarathonBet */
                        case 15:
                            /* Si no tenemos información del feed 5 (Interwitten) */
                            if( comparate.markets && comparate.markets[0].bets && _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 5 } ) == undefined )
                                comparate.info = data.info;
                        break;
                        case 6:
                        case 13:
                            if( comparate.markets && comparate.markets[0].bets )
                            {
                                if( _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 5 } ) == undefined &&
                                    _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 7 } ) == undefined &&
                                    _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 8 } ) == undefined &&
                                     _.findWhere( comparate.markets[0].bets[0].data, { "id_feed" : 15 } ) == undefined )
                                    comparate.info = data.info;
                            }
                        break;
                        default:
                            
                        break;
                    }

                    _.filter( data.markets, function( marketData )
                    {
                        /* Buscamos los mercados */
                        var fFindMarket = _.find( comparate.markets, function( marketComparate )
                        {
                            if( marketData.id == marketComparate.id && marketData.id_group == marketComparate.id_group )
                            {
                                _.filter( marketData.bets, function( betData )
                                {
                                    _.find( marketComparate.bets, function( betComparate )
                                    {
                                        if( betComparate.name === betData.name )
                                        {
                                            var fFindBet = _.find( betComparate.data, function( data )
                                            {
                                                if( data.id_feed == feedID )
                                                {
                                                    if( data.n_odd != betData.odd)
                                                        data.n_odd = betData.odd;

                                                    return betData;
                                                }
                                            });

                                            if( fFindBet == undefined )
                                            {
                                                betComparate.data.push({
                                                    id_feed: feedID,
                                                    id: betData.id,
                                                    n_odd: betData.odd
                                                });
                                            }

                                            //bet.data.sort( fn._order('-n_odd') );
                                            betComparate.data.sort( fn._orderOdds() );
                                        }
                                    });

                                });

                                return marketData;
                            }
                        });
                        /* Si no encontramos el mercado */
                        if( fFindMarket == undefined )
                        {
                            var bets = [],
                            nOrder = 0;

                            //console.log( marketData.name );
                            _.filter( data.participants, function( orderParticipant )
                            {
                                _.filter( marketData.bets, function( bet )
                                {
                                    //console.log( orderParticipant.name + " == " + bet.name + " && " + data.participants[ nOrder ].name + " == " + orderParticipant.name );
                                    if( bet.name == 'Draw' && bets.length == 1 )
                                    {
                                        //console.log("push Draw");//

                                        nOrder++;

                                        bets.push({
                                            name: bet.name,
                                            data: [{
                                                id_feed: feedID,
                                                id: bet.id,
                                                n_odd: bet.odd
                                            }]
                                        });
                                    }
                                    
                                    if( orderParticipant.name == bet.name ) // && data.participants[ nOrder ].name == orderParticipant.name )
                                    {
                                        //console.log("push " + bet.name);//

                                        bets.push({
                                            name: bet.name,
                                            data: [{
                                                id_feed: feedID,
                                                id: bet.id,
                                                n_odd: bet.odd
                                            }]
                                        });
                                    }
                                });
                            });

                            if( marketData.id == 1 || marketData.id == 4 || marketData.id == 5 || marketData.id == 7 )
                            {
                                comparate.markets.push({
                                    id: marketData.id,
                                    id_group: marketData.id_group,
                                    name: marketData.name,
                                    bets: bets
                                });
                            }
                        }

                    });

                    return comparate;
                }
            });

            /* Si no encontramos datos (Primera vez) */
            if( fCompData == undefined )
            {
                var markets = [];

                _.filter( data.markets, function( market )
                {
                    var bets = [],
                        nOrder = 0;

                    //console.log( market.name );
                    _.filter( data.participants, function( orderParticipant )
                    {
                        _.filter( market.bets, function( bet )
                        {
                            //console.log( orderParticipant.name + " == " + bet.name + " && " + data.participants[ nOrder ].name + " == " + orderParticipant.name );
                            if( bet.name == 'Draw' && bets.length == 1 )
                            {
                                //console.log("push Draw");//

                                nOrder++;

                                bets.push({
                                    name: bet.name,
                                    data: [{
                                        id_feed: feedID,
                                        id: bet.id,
                                        n_odd: bet.odd
                                    }]
                                });
                            }
                            
                            if( orderParticipant.name == bet.name ) // && data.participants[ nOrder ].name == orderParticipant.name )
                            {
                                //console.log("push " + bet.name);//

                                bets.push({
                                    name: bet.name,
                                    data: [{
                                        id_feed: feedID,
                                        id: bet.id,
                                        n_odd: bet.odd
                                    }]
                                });
                            }

                            // if( orderParticipant.name == bet.name && data.participants[ nOrder ].name == orderParticipant.name ||
                            //     (bet.name == 'Draw' && bets.length == 1) )
                            // {
                            //     if( bet.name == 'Draw' || market.bets.length == 2 )
                            //         nOrder++;

                            //     console.log("push");//

                            //     bets.push({
                            //         name: bet.name,
                            //         data: [{
                            //             id_feed: feedID,
                            //             id: bet.id,
                            //             n_odd: bet.odd
                            //         }]
                            //     });
                            // }
                        });
                    });
                    
                    if( market.id == 1 || market.id == 4 || market.id == 5 || market.id == 7 )
                    {
                        markets.push({
                            id: market.id,
                            id_group: market.id_group,
                            name: market.name,
                            bets: bets
                        });
                    }
                });

                exit.push({
                    sport: data.sport,
                    sportID: data.sportID,
                    info: data.info,
                    log: data.log || null,
                    empty: 0,
                    league: data.league,
                    event: data.event,
                    create: new Date(),
                    participants: data.participants,
                    markets: markets
                });
            }

            return defer.resolve();
        });

        return defer.promise;
    }) );
};
/**********************************************************/
/*                       SOCKET IO                        */
/**********************************************************/
io.on('connection', function( socket )
{
    //io.emit( "list-data-live", auxData );

    socket.on('subscribe', function(room) 
    { 
        logger.info( '->>joining room', room );
        socket.join(room);

        //console.log( activeRoom.length );

        // if( activeRoom.length == 0 )  
        //     jSocket.sendMessage({command:'restart'});

        if( room == "list-data-live" )
        {
            activeRoom.push('list-data-live');
            io.sockets.in( "list-data-live" ).emit('message', dataList );
        }
        else
        {
            _.each( auxData, function(data)
            {
                var eventName = fn._replaceName(data.event);

                if( eventName == room )
                {
                    activeRoom.push( eventName );
                    io.sockets.in( room ).emit('message', data );
                }
            });
        }
    });

    socket.on('unsubscribe', function(room) 
    {  
        logger.warn( '<<-leaving room', room );
        socket.leave(room); 
    });

    // socket.on('send', function( data ) 
    // {
    //     console.log('sending message');
    //     io.sockets.in(data.room).emit('message', data);
    // });
});

/**********************************************************/
/*                       EXPRESS                          */
/**********************************************************/
app.get('/', function(req, res)
{
  res.send('<html/>');
  res.end();
});

app.get('/reset-real-time', function(req, res)
{
    clearTimeout(timer);
    logger.fatal( "[CONNECTION] Restarting Server by HTTP" );
    //jSocket.sendError("[CONNECTION] Restarting Server by HTTP");

    //jSocket.sendMessage({command:'restart'});
    res.send('Se ha reiniciado el server, cierre la página... (Actualmente no funciona)');
    res.end();
});

// app.get('/stop-real-time', function(req, res)
// {
//     logger.fatal( "Se detiene el server via http..." );
//     jSocket.sendMessage({command:'stop'});
//     res.send('Se ha detenido el server...');
//     res.end();
// });

// app.get('/start-real-time', function(req, res)
// {
//     logger.fatal( "Se inicia el server via http..." );
//     jSocket.sendMessage({command:'start'});
//     res.send('Se ha iniciado el server...');
//     res.end();
// });

app.get("/file/:name", function(req, res)
{
    logger.info( "Acceso al archivo desde: %s", req.headers.origin );

    var filePath = __dirname + '/temp/' + req.params.name;

    switch( req.headers.origin )
    {
        case 'http://new.besgam.com':
             res.header("Access-Control-Allow-Origin", "http://new.besgam.com");
        break;
        case 'http://des.besgam.com':
             res.header("Access-Control-Allow-Origin", "http://des.besgam.com");
        break;
        case 'http://www.besgam.com':
             res.header("Access-Control-Allow-Origin", "http://www.besgam.com");
        break;
    }

    //res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    res.sendFile( filePath, null, function(err)
    {
        if( err != undefined )
            logger.error( JSON.stringify(err) );
        
        res.end();
    });
});

app.use(publicDir);

http.listen( port, function()
{
    logger.trace( 'listening on: %s', port );
});

//sudo pm2 start index.js --merge-logs --log-date-format="YYYY-MM-DD HH:mm Z" --output /home/ec2-user/web-server/logs/output.log --error /home/ec2-user/web-server/logs/error.log

//sudo pm2 set pm2-logrotate:max_size 512M
//sudo pm2 set pm2-logrotate:interval_unit 'DD'
//sudo pm2 set pm2-logrotate:interval 1
//sudo pm2 set pm2-logrotate:retain 7