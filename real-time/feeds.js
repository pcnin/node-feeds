[
    {
        /* Marca Apuestas */
        id: 6,
        name: 'marca',
        host: 'genfeeds.marcaapuestas.es',
        protocol: 'http:',
        port: 80,
        path: '/odds_feed?key=get_inplay_schedule&is_inplay=Y'
    },
    {
        /* TitanBet */
        id: 13,
        name: 'titanbet',
        host: 'feedsgen.titanbet.com',
        protocol: 'http:',
        port: 80,
        path: '/odds_feed?key=get_inplay_schedule&is_inplay=Y'
    },
    {
        /* Interwetten */
        id: 5,
        name: 'interwetten',
        host: 'ad.interwetten.com',
        protocol: 'http:',
        port: 80,
        path: '/ticker_temp/offer.asmx/GetLiveEventList?LanguageID=ES&Filter='
    },
    // {
    //     /* kambi */
    //     id: 12,
    //     name: '888',
    //     host: 'e3-api.kambi.com',
    //     protocol: 'https:',
    //     port: 443,
    //     path: '/offering/api/v3/888es/listView/all/all/all/all/in-play/?lang=es_ES&market=ES&client_id=2&channel_id=1&ncid=1483373377760&betOffers=COMBINED&categoryGroup=COMBINED',
    //     method : 'GET'
    // },
    {
        /* Paf */
        id: 2,
        name: 'paf',
        host: 'www.paf.es',
        protocol: 'https:',
        port: 443,
        path: '/sportsbettingfeed/live.xml',
        headers: { 'Connection':'Close' },
        agent: false
    },
    {
        /* Goldenpark */
        id: 8,
        name: 'goldenpark',
        host: 'livebetting.goldenpark.es',
        protocol: 'http:',
        port: 80,
        path: '/cache/scoreboardeventlist/ES.xml',
        headers: { 'Connection':'Close' },
        agent: false
    },
    {
        /* MarathonBet */
        id: 15,
        name: 'marathonbet',
        host: 'livefeeds.marathonbet.com',
        protocol: 'http:',
        port: 80,
        path: '/feed/besgam_span_liv'
    },
    // {
    //     /* Pinnacle */
    //     id: 16,
    //     name: 'pinnacle',
    //     host: 'api.pinnacle.com',
    //     protocol: 'https:',
    //     port: 443,
    //     path: '/v2/sports',
    //     auth: 'Basic QUZGNTAzNjpCZXNnYW05NEA=',
    //     headers: {
    //         'Content-length' : 0,
    //         'Content-Type'   : 'application/json',
    //         'Accept'         : 'application/json',
    //         'Authorization'  : 'Basic QUZGNTAzNjpCZXNnYW05NEA='
    //     }
    // },
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
    }
    
]