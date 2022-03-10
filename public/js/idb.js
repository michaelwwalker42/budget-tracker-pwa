let db;
const indexedDB = window.indexedDB;
const request = indexedDB.open('budget_tracker', 1)

// this event will emit if the database version changes (nonexistant to version 1, v1 to v2, etc.)
request.onupgradeneeded = function (event) {
  // save a reference to the database 
  const db = event.target.result;
  // create an object store (table) called `new_transaction`, set it to have an auto incrementing primary key of sorts 
  db.createObjectStore('new_transaction', { autoIncrement: true });
};

// upon a successful 
request.onsuccess = function (event) {
  // when db is successfully created with its object store (from onupgradedneeded event above) or simply established a connection, save reference to db in global variable
  db = event.target.result;

  // check if app is online, if yes run checkDataBase() function to send all local db data to api
  if (navigator.onLine) {
    // we haven't created this yet, but we will soon, so let's comment it out for now
    checkDataBase();
  }
};
request.onerror = function (event) {
  // log error here
  console.log(event.target.errorCode);
};


function saveRecord(record) {
  // open a new transaction with the database with read and write permissions 
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access the object store for `new_transaction`
  const store = transaction.objectStore('new_transaction');

  // add record to your store with add method
  store.add(record);
}

function checkDataBase() {
  // open a transaction on your db
  const transaction = db.transaction(['new_transaction'], 'readwrite');

  // access your object store
  const store = transaction.objectStore('new_transaction');

  // get all records from store and set to a variable
  const getAll = store.getAll();

  // upon a successful .getAll() execution, run this function
  getAll.onsuccess = function () {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          // open one more transaction
          const transaction = db.transaction(['new_transaction'], 'readwrite');

          const store = transaction.objectStore('new_transaction');
          // clear all items in your store
          store.clear();
        })
        .catch(err => {
          console.log(err);
        });
    }
  };
}

window.addEventListener('online', checkDataBase);