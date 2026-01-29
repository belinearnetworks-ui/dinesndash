// let client_id="1TxjF_CnvL1OQC26uW5nWWf5LQlixNa_-Xh0ClmEkyo";

// function api(client_id){
//     fetch("https://api.unsplash.com/search/photos?client_id="+client_id+"&query=mango&per_page=5")
//     .then(response => response.json())
//     .then(data => {
//         console.log(data.results.length);
//         console.log(data.results[1].urls.raw);
//     }).catch(error => {
//         console.error('Error fetching image:', error);
//     });
// }

// api(client_id);

let Sentence="We will win no Matter what";
console.log(Sentence.toLocaleLowerCase());

let result=Sentence.search("win")
console.log(result)