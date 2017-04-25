"use strict";

/**********************************************************/
/*                      Includes                          */
/**********************************************************/
var fn          = require("./functions.js"),
    fs          = require('fs'),
    file        = "./dictionary/goldenpark.js",
    Q           = require("q"),
    _           = require("underscore"),
    dictionary  = fn._readFile( file ),
    parseString = require('xml2js').parseString,
    log4js      = require('log4js');

/**********************************************************/
/*                      Variables                         */
/**********************************************************/
const ID_FEED = 8,
      NAME_FEED = 'Goldenpark';

log4js.configure({
  appenders: [
    { type: 'console' },
    //{ type: 'file', filename: 'logs/goldenpark.log', category: 'goldenpark' }
  ]
});

var logger = log4js.getLogger('goldenpark');

fs.watch( file, (curr, prev) => 
{
  dictionary = fn._readFile( file );
});

var parser = module.exports.parser = function( xml )
{
    var defer = Q.defer();

    function parserXML( xml )
    {
        var defer = Q.defer();

        parseString( xml, function (err, result) 
        {
            return err ? defer.reject(new Error("Archivo No Leído")) : defer.resolve(result);
        });

        return defer.promise;
    };

    function getDataJson( json )
    {
        try
        {
            var exit = [],
                data = _.filter( json, function( group )
                {
                    //console.log( group.$.sporttype );
                    /* Comprobamos si existe el deporte */
                    _.filter( dictionary, function( sport )
                    {
                        //console.log( sport.name.toUpperCase() + " == " + group.$.sporttype );
                        /* Comprobamos que tengamos el deporte */
                        if( sport.name.trim().toUpperCase() == group.$.sporttype.trim().toUpperCase() )
                        {
                            var eventName = group.Display[0].$.name.split( group.$.leadseparator ),
                                participantData = [],
                                participantArray = [],
                                aParticipant = [],
                                markets = [];

                            if( sport.id == 3 && eventName[0].split(" / ").length > 1 && eventName[1].split(" / ").length > 1 )
                            {
                                var participantDouble = eventName[0].split(" / ").concat( eventName[1].split(" / ") );

                                var fdouble = _.filter( participantDouble, function( doubleName )
                                {
                                    /* Comprobamos si existe el participante */
                                    fParticipant = _.filter( sport.participants, function( participantName )
                                    {
                                        if( participantName.name != null && participantName.name.trim().toLowerCase() == doubleName.trim().toLowerCase() )
                                        {
                                            logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                            if( participantName.name.trim().toLowerCase() == participantDouble[0].trim().toLowerCase() )
                                            {
                                                participantArray[0] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };
                                            }
                                            else if( participantName.name.trim().toLowerCase() == participantDouble[1].trim().toLowerCase() )
                                            {
                                                participantArray[1] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };
                                            }
                                            else if( participantName.name.trim().toLowerCase() == participantDouble[2].trim().toLowerCase() )
                                            {
                                                participantArray[2] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };
                                            }
                                            else
                                            {
                                                participantArray[3] = {
                                                    id  : participantName.id,
                                                    name: participantName.name,
                                                    feed: participantName.feed,
                                                    img : participantName.img
                                                };
                                            }

                                            return participantName;
                                        }
                                    });

                                    if( fParticipant.length > 0 )
                                        return doubleName;

                                });

                                if( fdouble.length == 4 )
                                {
                                    var participantNameDouble = {};

                                    if( participantArray[0].name.trim().toLowerCase() + " / " + participantArray[1].name.trim().toLowerCase() == eventName[0].trim().toLowerCase() )
                                    {
                                        participantNameDouble = {
                                            id  : [ participantArray[0].id, participantArray[1].id ],
                                            name: participantArray[0].name + " / " + participantArray[1].name,
                                            feed: participantArray[0].feed + " / " + participantArray[1].feed,
                                            img : participantArray[0].img
                                        };

                                        participantData[0] = {
                                            id  : participantNameDouble.id,
                                            name: participantNameDouble.name,
                                            feed: participantNameDouble.feed,
                                            img : participantNameDouble.img
                                        };
                                    }
                                    
                                    if( participantArray[2].name.trim().toLowerCase() + " / " + participantArray[3].name.trim().toLowerCase() == eventName[1].trim().toLowerCase() )
                                    {
                                        participantNameDouble = {
                                            id  : [ participantArray[2].id, participantArray[3].id ],
                                            name: participantArray[2].name + " / " + participantArray[3].name,
                                            feed: participantArray[2].feed + " / " + participantArray[3].feed,
                                            img : participantArray[2].img
                                        };

                                        participantData[1] = {
                                            id  : participantNameDouble.id,
                                            name: participantNameDouble.name,
                                            feed: participantNameDouble.feed,
                                            img : participantNameDouble.img
                                        };
                                    }

                                    fParticipant = fdouble;
                                }
                            }
                            else
                            {
                                var fParticipant = _.filter( sport.participants, function( participantName )
                                {
                                    if( participantName.name != null )
                                    {
                                        if( participantName.name.trim().toLowerCase() == eventName[0].trim().toLowerCase() )
                                        {
                                            participantData[0] = {
                                                id  : participantName.id,
                                                name: participantName.name,
                                                feed: participantName.feed,
                                                img : participantName.img
                                            };

                                            logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                            return participantName;
                                        }
                                        else if( participantName.name.trim().toLowerCase() == eventName[1].trim().toLowerCase() )
                                        {
                                            participantData[1] = {
                                                id  : participantName.id,
                                                name: participantName.name,
                                                feed: participantName.feed,
                                                img : participantName.img
                                            };

                                            logger.info("Se ha encontrado el participante: ['" + participantName.name + "']");

                                            return participantName;
                                        }
                                    }

                                });
                            }

                            if( fParticipant.length > 1 )
                            {
                                logger.info("Se han encontrado participantes suficientes para crear el evento.");

                                if( group.marketbasic )
                                {
                                    _.filter( group.marketbasic, function( marketbasic )
                                    {
                                        _.filter( marketbasic.marketname, function( marketname )
                                        {
                                            var fMarkets = _.find( sport.markets, function( marketName )
                                            {
                                                //console.log( marketName.name.trim().toLowerCase() + " == " + marketname.trim().toLowerCase() );
                                                if( marketName.name.trim().toLowerCase() == marketname.trim().toLowerCase() )
                                                {
                                                    logger.info("Se ha encontrado el mercado: ['" + marketname + "']");

                                                    var minPart = participantData.length;

                                                    _.filter( marketbasic.selectionsbasic, function( selectionsbasic )
                                                    {
                                                        _.filter( selectionsbasic.selectionbasic, function( selectionbasic )
                                                        {
                                                            //console.log( selectionbasic.name[0] );
                                                            if( selectionbasic.name[0].trim().toLowerCase() == 'empate' )
                                                            {
                                                                aParticipant.push({
                                                                    id: selectionbasic.idfoselection[0],
                                                                    name: 'Draw',
                                                                    odd: (selectionbasic.currentpriceup[0] / selectionbasic.currentpricedown[0])+1
                                                                });

                                                                minPart++;
                                                            }
                                                            else
                                                            {
                                                                var fParticipant = _.find( participantData, function( participantName )
                                                                {
                                                                    if( participantName.name != null && participantName.name.trim().toLowerCase() == selectionbasic.name[0].trim().toLowerCase() )
                                                                    {
                                                                        //console.log( participantName.name.trim().toLowerCase() + " == " + selectionbasic.name.trim().toLowerCase() );
                                                                        aParticipant.push({
                                                                            id: selectionbasic.idfoselection[0],
                                                                            name: participantName.feed,
                                                                            odd: (selectionbasic.currentpriceup[0] / selectionbasic.currentpricedown[0])+1
                                                                        });

                                                                        return participantName;
                                                                    }
                                                                });

                                                                if( fParticipant == undefined )
                                                                    logger.warn("No se ha encontrado la cuota: ['" + selectionbasic.name[0] + "']");                                                            
                                                            }
                                                        });
                                                    });

                                                    if( aParticipant.length == minPart && participantData.length > 1)
                                                    {
                                                        markets.push({
                                                            id: marketName.id,
                                                            id_group: marketName.id_group,
                                                            name: marketName.feed,
                                                            bets: aParticipant
                                                        });
                                                    }

                                                    return marketName;
                                                }
                                            });

                                            if( fMarkets != undefined && markets.length > 0 )
                                            {
                                                var score = [],
                                                    game = [],
                                                    sets = [],
                                                    set = [],
                                                    order = null,
                                                    hserving = null;

                                                //console.log(JSON.stringify(group.Player));

                                                _.filter( group.Player, function( dataInfo )
                                                {
                                                    order = (dataInfo.$.type == 'True') ? 0 : 1,
                                                    hserving = (order == 0 && dataInfo.$.flag1) ? true : false;

                                                    _.each( dataInfo.Counter, function(counter)
                                                    {
                                                        switch( counter.$.name )
                                                        {
                                                            case 'GOALS': // Futbol
                                                                score[order] = counter.$.value;
                                                            break;
                                                            case 'POINTS': // Baloncesto
                                                                game[order] = counter.$.value;
                                                            break;
                                                            case 'SETS':    // Tenis
                                                                sets[order] = counter.$.value;
                                                            break;
                                                            case 'SETSCORE': // Tenis
                                                                set[order] = counter.$.value;
                                                            break;
                                                        };
                                                    });
                                                });

                                                exit.push({
                                                    sport: sport.type,
                                                    sportID: sport.id,
                                                    league: null,
                                                    event: participantData[0].feed + " vs " + participantData[1].feed,
                                                    info: {
                                                        startTime: null,
                                                        gameTime: null,
                                                        score: (function( score )
                                                        {
                                                            switch( sport.id )
                                                            {
                                                                case 1:
                                                                    return score.join(':');
                                                                break;
                                                                case 2:
                                                                    return game.join(':');
                                                                break;
                                                                case 3:
                                                                    var point = [0,15,30,40,'A'];

                                                                    return point[ game[0] ] + ':' + point[ game[1] ];
                                                                break;
                                                            }
                                                        })(score),
                                                        game: game.join(':'),
                                                        sets: sets.join(':'),
                                                        set: (function(set)
                                                        {
                                                            if( set.length > 0 )
                                                            {
                                                                var phome = set[0].split(','),
                                                                    paway = set[1].split(','),
                                                                    set = [];

                                                                for( var nCont = 0, len = phome.length;
                                                                     nCont < len;
                                                                     nCont++ )
                                                                {
                                                                    if( phome[nCont] != 0 || paway[nCont] != 0 )
                                                                        set.push(phome[nCont]+':'+paway[nCont]);
                                                                }
                                                            }

                                                            return set;
                                                        })(set),
                                                        hserving: hserving,
                                                        ycard: null,
                                                        rcard: null,
                                                        status: null
                                                    },
                                                    participants: _.map(participantData, function( data )
                                                    {
                                                        return {
                                                            id  : data.id,
                                                            name: data.feed,
                                                            img : data.img
                                                        }
                                                    }),
                                                    markets: markets
                                                });
                                            }
                                            else
                                            {
                                                logger.warn("No se encuentra ningun mercado para el evento: ['" + group.Display[0].$.name + "']");
                                            }

                                        });
                                    });
                                }
                                else
                                {
                                    logger.warn("No se encuentra ningun mercado para el evento: ['" + group.Display[0].$.name + "']");
                                }
                            }
                            else
                                logger.warn("No se encuentran participantes suficientes para el evento: ['" + group.Display[0].$.name + "']");


                            return sport;
                        }
                    });

                }, []);

            return exit;
        }
        catch( err )
        {
            logger.fatal("error: " + err);

            return [];
        }
    };

    parserXML( xml )
        .then( function( result )
        {
            var json = typeof( result.Events.Event ) != 'undefined' 
                   ? result.Events.Event : [];

            return getDataJson( json );
        })
        .then( function( data )
        {
            var aData = {
                feedID: ID_FEED,
                feed: NAME_FEED,
                data: data
            }
            //console.log( JSON.stringify(aData) );
            
            return defer.resolve( aData );
        })
        .fail( function( err )
        {
            logger.fatal("fail: " + err);
            return defer.reject(err.message);
        });

    return defer.promise;
}; 