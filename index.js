import axios from 'axios';
import express from 'express'
import dotenv from 'dotenv';
import brands from './brand.js';
import { parseString } from 'xml2js';
const app = express();
dotenv.config();





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

function removeBrand(str, wordsArray) {
    // Find the first word in wordsArray that exists in str (case insensitive and whole word match)
    const foundWord = wordsArray.find(word => {
        const regex = new RegExp('\\b' + word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi');
        return regex.test(str);
    });

    if (foundWord) {
        // Remove the found word from str using replace and regex (to remove all occurrences, case insensitive)
        const modifiedString = str.replace(new RegExp('\\b' + foundWord.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&') + '\\b', 'gi'), '');
        
        // Return an object with modified string and the found word (original case)
        return {
            modifiedString: modifiedString.trim(),  // trim to remove leading/trailing spaces
            foundWord: foundWord
        };
    } else {
        // Return null or some indication that no match was found
        return null;
    }
}


function formatString(str) {
    let brand = ""
    const remove = ["mm", "ml", "kg", "g", "gr", "£", "cl", "lt", "Each", ".M", ".E"]; // Strings to be removed
    const remove2 = [".M", ".E"]; // Strings to be removed
    const measurements = ["ml", "kg", "g", "gr", "cl", "lt"]; // Strings to be considered as measurements

    let cleanedStr = str.trim(); // Trim whitespace from the start and end of the string
    //console.log("Before : ", cleanedStr)
    // Remove the word "Cyprus" if it is the first word in the string
    if (cleanedStr.toLowerCase().startsWith("cyprus ")) {
        cleanedStr = cleanedStr.slice(7); // Remove "Cyprus " (7 characters) from the start of the string
    }

    // Regular expression pattern for matching measurements with numbers and optional multiplication symbols preceding them
    const measurementPattern = new RegExp(`\\b(\\d+(?:x\\d+)?(?:\\.\\d+)?) ?(${measurements.join('|')})\\b`, 'ig');

    // Extract measurement
    const measurementMatch = cleanedStr.match(measurementPattern);
    const measurement = measurementMatch ? measurementMatch[0] : '';

    // Remove measurements and strings to be removed
    cleanedStr = cleanedStr.replace(measurementPattern, ''); // Remove measurement from name

    remove.forEach(word => {
        cleanedStr = cleanedStr.replace(new RegExp(`\\b${word}\\b`, 'ig'), ''); // Remove other unwanted strings
    });

    // Format cleaned string
    cleanedStr = cleanedStr.replace(/\b\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    cleanedStr = cleanedStr.replace(/&amp;/gi, "&").replace(/&apos;/gi, "'");

    const brandRemoved =  removeBrand(cleanedStr, brands)
    if (brandRemoved) {     
        
        brand = brandRemoved.foundWord
        cleanedStr = brandRemoved.modifiedString
    }

    remove2.forEach(word => {
        cleanedStr = cleanedStr.replace(new RegExp(`\\b${word}\\b`, 'ig'), ''); // Remove other unwanted strings
    });

    
    return { name: cleanedStr.trim(), measurement: measurement, brand: brand };
}


function extractVariables(originalString, variable) {
    // Split the original string by "-"
    var phases = originalString.split("-");
    
    console.log(originalString)
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
    console.log("Getting Items")
    axios.post(process.env.URL, Body,{ headers: { "Content-Type": "text/xml; charset=utf-8" }})
    .then((x) => {
        console.log(x.length, "Items got")
        parseString(x.data, function (err, result) {
            let items = result['soap:Envelope']['soap:Body'][0].GetUrunListesiResponse[0].GetUrunListesiResult[0].clsUrunler
            console.log("Got Items", items[0],items[1], "...")
            let itemsJS = items.map(x => 
            {
                let format = formatString(x.URUNACIKLAMA[0])
                console.log(x)
                return {name: format.name, id: x.URUNID[0], price: x.PERSATISFIYAT3[0], unit: x.BARKODLAR[0].clsBarkodlar[0].BIRIMKOD[0],brand: format.brand,  measurement: format.measurement ,group: x.URUNGRUBU[0],  sku: x.URUNKOD[0], Collection: extractVariables(x.URUNGRUPLAR[0], "collection"), parentfacet: extractVariables(x.URUNGRUPLAR[0], "parentfacet"), childfacet: extractVariables(x.URUNGRUPLAR[0], "childfacet")}
            })

            //response.send({Items: itemsJS});
            response.status(200).send({ Items: itemsJS });
        })
    })
    .catch((x) => {
        console.log("error", x);
        response.status(500).send(("Error occured", x));
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`API server listening on port ${port}`);
});



 