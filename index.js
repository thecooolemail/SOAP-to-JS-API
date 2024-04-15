const { default: axios } = require('axios');
const express = require('express');
require('dotenv').config()
const app = express();
var parseString = require('xml2js').parseString;



app.use(express.json());

let Body = `
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
    <soap:Body>
        <GetUrunListesi xmlns="http://tempuri.org/">
        <strHata>string</strHata>
        </GetUrunListesi>
    </soap:Body>
    </soap:Envelope>
`

function extractVariables(originalString, variable) {
    // Split the original string by "-"
    var phases = originalString.split("-");
    
    // Extracting variables
    var collection = phases[1].replace(/&amp;|&Amp;/g, "&").toLowerCase().replace(/\b\w/g, function(char) { return char.toUpperCase(); }); // Second phase after first
    var parentfacet = phases[2].replace(/&amp;|&Amp;/g, "&").toLowerCase().replace(/\b\w/g, function(char) { return char.toUpperCase(); }); // Second phase after first
    var childfacet = phases[3].replace(/&amp;|&Amp;/g, "&").toLowerCase().replace(/\b\w/g, function(char) { return char.toUpperCase(); }); // Last phase
    
    // Return the requested variable based on the input
    switch(variable) {
        case 'collection':
            return collection;
        case 'parentfacet':
            return parentfacet;
        case 'childfacet':
            return childfacet;
        default:
            return null;
    }
}

  
app.get("/", (request, response) => {
    response.send({Status: "OK"});
 });

 app.get("/allproducts", (request, response) => {
    axios.post('http://193.115.198.196:8089/Service1.asmx?op=GetUrunListesi', Body,{ headers: { "Content-Type": "text/xml; charset=utf-8" }})
    .then((x) => {
        parseString(x.data, function (err, result) {
            let items = result['soap:Envelope']['soap:Body'][0].GetUrunListesiResponse[0].GetUrunListesiResult[0].clsUrunler
            console.log(items[0].BARKODLAR[0].clsBarkodlar[0].BIRIMKOD[0])
            
            let itemsJS = items.map(x => {return {name: x.URUNACIKLAMA[0], id: x.URUNID[0], price: x.PERSATISFIYAT3[0], unit: x.BARKODLAR[0].clsBarkodlar[0].BIRIMKOD[0], group: x.URUNGRUBU[0],  sku: x.URUNKOD[0], Collection: extractVariables(x.URUNGRUPLAR[0], "collection"), parentfacet: extractVariables(x.URUNGRUPLAR[0], "parentfacet"), childfacet: extractVariables(x.URUNGRUPLAR[0], "childfacet")}})
            
            response.send({Items: itemsJS});
        })
    })
    .catch((x) => {
        console.log("error");
        response.status(500).send("Error occurred"); 
    });
});

app.get("/productscount/:count", (request, response) => {
    const count = parseInt(request.params.count);
    console.log(count)
    axios.post('http://193.115.198.196:8089/Service1.asmx?op=GetUrunListesi', Body,{ headers: { "Content-Type": "text/xml; charset=utf-8" }})
    .then((x) => {
        //console.log(x.data)
        parseString(x.data, function (err, result) {
            let items = result['soap:Envelope']['soap:Body'][0].GetUrunListesiResponse[0].GetUrunListesiResult[0].clsUrunler
            let itemsJS = items.map(x => {return {name: x.URUNACIKLAMA[0], id: x.URUNID[0], price: x.PERSATISFIYAT3[0], unit: x.BARKODLAR[0].clsBarkodlar[0].BIRIMKOD[0], group: x.URUNGRUBU[0],sku: x.URUNKOD[0], Collection: extractVariables(x.URUNGRUPLAR[0], "collection"), parentfacet: extractVariables(x.URUNGRUPLAR[0], "parentfacet"), childfacet: extractVariables(x.URUNGRUPLAR[0], "childfacet")}})
            response.send({Items: itemsJS.slice(0, count)});
        })
    })
    .catch((x) => {
        console.log("error");
        response.status(500).send("Error occurred"); 
    });
});





const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});



 