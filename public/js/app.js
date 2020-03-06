class Employee {
    constructor(doc, userId) {
        this.access = doc['access'];
        this.email = doc['email'];
        this.fName = doc['fName'];
        this.lName = doc['lName'];
        this.orgId = doc['organization'];
        this.userId = userId;
    }
}

class Admin extends Employee {
    constructor(doc, userId) {
        super(doc, userId);
    }
}

class Organization {
    constructor(doc, orgId) {
        this.address = doc['address'];
        this.email = doc['email'];
        this.location = doc['location'];
        this.name = doc['name'];
        this.orgId = orgId;
    }
}


class Event {
    constructor(doc, eventId) {
        this.addedBy = doc['addedBy'];
        this.attendeeCount = doc['attendeeCount'];
        this.checkInCount = doc['checkInCount'];
        this.end = doc['end'];
        this.eventId = eventId;
        this.location = doc['location'];
        this.name = doc['name'];
        this.orgId = doc['orgId'];
        this.posted = doc['posted'];
        this.start = doc['start'];
        this.type = doc['type'];
    }
}


const db = firebase.firestore();
let admin = null;
let organization = null;
let events = [];
let employees = [];

async function fetchHTML(url) {
    return await (await fetch(url)).text();
}

function getTodayDate() {
    let date = new Date();
    date.setHours(0);
    date.setMinutes(0);
    date.setSeconds(0);
    date.setMilliseconds(0);
    return date;
}

function submitSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth()
        .createUserWithEmailAndPassword(email, password)
            .catch(function(error) {
                var errorCode = error.code;
                var errorMessage = error.message;
                console.log(errorCode, errorMessage);
            });

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            db.collection("organizations")
                .add({
                    name: document.getElementById('orgName').value,
                    email: document.getElementById('orgEmail').value,
                    location: document.getElementById('location').value,
                    address: document.getElementById('address').value,
                    added: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then(docRef => {
                    db.collection("users").doc(user.uid)
                        .set({
                            access: 2,
                            created: firebase.firestore.FieldValue.serverTimestamp(),
                            email: user.email,
                            fName: document.getElementById('fName').value,
                            lName: document.getElementById("lName").value,
                            organization: docRef.id
                        })
                        .then(() => {
                            // done!!!
                            window.location.href="index.html"
                        })
                        .catch(error => {
                            console.error("Error writing document: ", error);
                        });
                })
                .catch(error => {
                    console.error("Error writing document: ", error);
                });
        }
    });
    return false;
}

function checkLoggedIn() {
    firebase.auth().onAuthStateChanged(function(user) {
        if (user) {
            db.collection("users").doc(user.uid).get()
                .then(doc => {
                    if (doc.exists) {
                        admin = new Admin(doc.data(), user.uid);
                        db.collection("organizations").doc(admin.orgId).get()
                            .then(doc => {
                                if (doc.exists) {
                                    organization = new Organization(doc.data(), admin.orgId);
                                } else {
                                    window.location.href = "login.html";
                                }
                            })
                    } else {
                        window.location.href = "login.html";
                    }
                })
                .catch(error => {
                    console.log(error);
                })
        } else {
          window.location.href = "login.html";
        }
      });
}

function submitCreateEventForm() {
    const name = document.getElementById("event_name").value;
    const start = document.getElementById("event_start_date").value;
    const end = document.getElementById("event_end_date").value;
    const location = document.getElementById("event_location").value;
    const type = document.getElementById("event_type").value;

    db.collection("events")
            .add({
                location, name,
                addedBy: admin.userId,
                attendeeCount: 0,
                checkInCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                end: firebase.firestore.Timestamp.fromDate(new Date(end)),
                orgId: organization.orgId,
                posted: false,
                start: firebase.firestore.Timestamp.fromDate(new Date(start)),
                type: Number.parseInt(type)
            })
            .then(docRef => {
                console.log("event added");
            })
            .catch(error => {
                console.log(error);
            });

    return false;
}

function loadOnGoingEvents() {
    if (admin == null || organization == null) {
        console.log("Please wait for setup to complete...");
        return;
    }

    const container = document.getElementById("ongoing_container");
    events = [];
    db.collection("events")
        .where("orgId", "==", organization.orgId)
        .where("end", ">=", firebase.firestore.Timestamp.fromDate(getTodayDate()))
        .get()
        .then(querySnapshot => {
            querySnapshot.forEach(doc => {
                events.push(new Event(doc.data(), doc.id));
            });
            let s = "";
            for (event of events) {
                s += "<p>" + event.eventId + " " + event.name + " " + event.orgId + "</p>";
            }
            container.innerHTML = s;
        })
        .catch(error => {
            console.log(error)
        });
}

function loadPastEvents() {
    const container = document.getElementById("past_container");
    db.collection("events")
        .where("orgId", "==", organization.orgId)
        .where("end", "<", firebase.firestore.Timestamp.fromDate(getTodayDate()))
        .get()
        .then(querySnapshot => {
            let s = "";
            querySnapshot.forEach(doc => {
                event = doc.data();
                s += "<p>" + doc.id+ " " + event["name"] + " " + event["orgId"] + "</p>";
            });
            container.innerHTML = s;
        })
        .catch(error => {
            console.log(error);
        });
}

function submitAddEmployeeForm() {
    const email = document.getElementById("emp_email").value;
    db.collection("users")
        .where("email", "==", email)
        .get()
        .then(querySnapshot => {
            if (querySnapshot['empty']) {
                console.log("Provided email does not exist");
            }

            employee = querySnapshot['docs'][0].data();
            employee_id = querySnapshot['docs'][0].id;
            if (employee["orgId"] == undefined) {
                db.collection("users").doc(employee_id)
                    .update({
                        access: 1,
                        organization: organization.orgId
                    })
                    .then(() => {
                        console.log("Added Successfully!");
                    })
                    .catch(error => {
                        console.log(error);
                    });
            } else {
                console.log("The person is already tied to an organization");
            }
        })
        .catch(error => {
            console.log(error);
        });
    return false;
}

function listEmployees() {
    const container = document.getElementById("employees_container");
    db.collection("users")
        .where("organization", "==", organization.orgId)
        .get()
        .then(querySnapshot => {
            let s = "";
            querySnapshot.forEach(doc => {
                employee = doc.data();
                s += "<p>" + doc.id+ " " + employee["fName"] + " " + employee["lName"] + " " + employee["access"] + "</p>";
            });
            container.innerHTML = s;
        })
        .catch(error => {
            console.log(error);
        });
}

function submitOrgUpdateForm() {
    const name = document.getElementById("orgName").value;
    const email = document.getElementById("orgEmail").value;
    const location = document.getElementById("orgLocation").value;
    const address = document.getElementById("orgAddress").value;
    db.collection("organizations").doc(organization.orgId)
        .update({
            name, email, location, address
        })
        .then(() => {
            console.log("update successful");
        })
        .catch(error => {
            console.log(error);
        });
    return false;
}

function submitProfileUpdateForm() {
    const email = document.getElementById("up_email").value;
    const old_password = document.getElementById("old_password").value;
    const password = document.getElementById("up_password").value;
    const cPassword = document.getElementById("up_cPassword").value;
    const fName = document.getElementById("up_fName").value;
    const lName = document.getElementById("up_lName").value;
    return false;
}