const db = firebase.firestore();

function submitSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth().createUserWithEmailAndPassword(email, password).catch(function(error) {
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorCode, errorMessage);
    });


    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            db.collection("organizations").add({
                name: document.getElementById('orgName').value,
                email: document.getElementById('orgEmail').value,
                location: document.getElementById('location').value,
                address: document.getElementById('address').value
            })
            .then(docRef => {
                db.collection("users").doc(user.uid).set({
                    access: 2,
                    created: firebase.firestore.FieldValue.serverTimestamp(),
                    email: user.email,
                    fName: document.getElementById('fName').value,
                    lName: document.getElementById("lName").value,
                    organization: docRef.id
                })
                .then(() => {
                    // done!!!
                    console.log("// done!!!");
                })
                .catch(error => {
                    console.error("Error writing document: ", error);
                });
            })
            .catch(error => {
                console.error("Error writing document: ", error);
            });
        } else {}
    });
}