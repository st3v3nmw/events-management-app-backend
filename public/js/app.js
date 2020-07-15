class User {
    constructor(doc, userId) {
        this.access = doc['access'];
        this.createdAt = dateString(doc['created'].toDate());
        this.email = doc['email'];
        this.fName = doc['fName'];
        this.lName = doc['lName'];
        this.orgId = doc['organization'];
        this.phoneNumber = doc['phoneNumber'];
        this.userId = userId;
    }
}

class Admin extends User {
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
        this.phoneNumber = doc['phoneNumber'];
    }
}


class Event {
    constructor(doc, eventId) {
        this.addedBy = doc['addedBy'];
        this.attendeeCount = doc['attendeeCount'];
        this.checkInCount = doc['checkInCount'];
        this.coordinates = doc['coordinates'];
        this.createdAt = dateString(doc['createdAt'].toDate());
        this.end = dateString(doc['end'].toDate());
        this.eventId = eventId;
        this.image = doc['image'];
        this.location = doc['location'];
        this.name = doc['name'];
        this.orgId = doc['orgId'];
        this.start = dateString(doc['start'].toDate());
        this.type = eventTypes[doc['type']];
    }
}

const db = firebase.firestore();
let admin = null;
let organization = null;
let events = [];
let employees = [];
let latitude = 0, longitude = 0;
let eventTypes = ["Conference", "Workshop", "Concert"];

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

function dateString(date) {
    return `${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`;
}

function dateTimeString(date) {
    return `${dateString(date)} ${date.getHours()}:${date.getMinutes()} ${date.getSeconds()}`;
}

function readFile() {
    if (this.files && this.files[0]) {
        let reader = new FileReader();
        reader.addEventListener("load", e => {
        document.getElementById("base64Image").innerText = e.target.result;
        });
        reader.readAsDataURL(this.files[0]);
    }
}

function submitSignUp() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    firebase.auth()
        .createUserWithEmailAndPassword(email, password)
            .catch(function(error) {
                displayErrorModal(error.message);
            });

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            db.collection("organizations")
                .add({
                    name: document.getElementById('orgName').value,
                    email: document.getElementById('orgEmail').value,
                    location: document.getElementById('location').value,
                    address: document.getElementById('address').value,
                    added: firebase.firestore.FieldValue.serverTimestamp(),
                    phoneNumber: document.getElementById('orgPhoneNumber').value
                })
                .then(docRef => {
                    db.collection("users").doc(user.uid)
                        .set({
                            access: 2,
                            created: firebase.firestore.FieldValue.serverTimestamp(),
                            email: user.email,
                            fName: document.getElementById('fName').value,
                            lName: document.getElementById("lName").value,
                            phoneNumber: document.getElementById("phoneNumber").value,
                            organization: docRef.id
                        })
                        .then(() => {
                            // done!!!
                            window.location.href="/"
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
                        document.getElementById("display_name").innerText = `${admin.fName} ${admin.lName}`;
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
    const image = document.getElementById("base64Image").innerText;
    let end_date = new Date(end);
    end_date.setMinutes(1);
    end_date.setHours(0);
    let start_date = new Date(start);
    start_date.setMinutes(1);
    start_date.setHours(0);

    db.collection("events")
            .add({
                image, location, name,
                addedBy: admin.userId,
                attendeeCount: 0,
                checkInCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                end: firebase.firestore.Timestamp.fromDate(end_date),
                coordinates: {longitude, latitude},
                orgId: organization.orgId,
                start: firebase.firestore.Timestamp.fromDate(start_date),
                type: Number.parseInt(type)
            })
            .then(docRef => {
                displaySuccessModal();
                // Add Event Calendar & Event Lineup
            })
            .catch(error => {
                displayErrorModal(error);
            });

    return false;
}

function loadOnGoingEvents() {
    const container = document.getElementById("ongoing_container");
    db.collection("events")
        .where("orgId", "==", organization.orgId)
        .where("end", ">=", firebase.firestore.Timestamp.fromDate(getTodayDate()))
        .get()
        .then(querySnapshot => {
            let columnDefs = [
                {headerName: "", field: "expand", width: 75, cellRenderer: params => {
                    let link = document.createElement('span');
                    link.innerText = "Expand";
                    link.style.textDecoration = "underline";
                    link.style.cursor = "pointer";
                    link.addEventListener('click', () => {
                        window.open(`list_attendees.html?id=${params.data.id}&name=${params.data.name}`,'targetWindow', `toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes`);
                    });
                    return link;
                }},
                {headerName: "Name", field: "name", sortable: true, filter: true},
                {headerName: "Location", field: "location", sortable: true, filter: true},
                {headerName: "Start", field: "start", width: 100, sortable: true, filter: true},
                {headerName: "End", field: "end", width: 100, sortable: true, filter: true},
                {headerName: "Type", field: "type", width: 120, sortable: true, filter: true},
                {headerName: "Attendees", field: "attendeeCount", width: 105, sortable: true, filter: true},
                {headerName: "Check-ins", field: "checkInCount", width: 100, sortable: true, filter: true},
                {headerName: "id", field: "id", width: 0, hide: true}
            ];
            let rowData = [];
            querySnapshot.forEach(doc => {
                event = new Event(doc.data(), doc.id);
                employee = doc.data();
                rowData.push({id: doc.id, name: event.name, location: event.location, start: event.start, end: event.end, type: event.type, attendeeCount: event.attendeeCount, checkInCount: event.checkInCount});
            });
            showGrid(columnDefs, rowData, container, "Ongoing Events");
        })
        .catch(error => {
            displayErrorModal(error);
        });
}

function loadPastEvents() {
    const container = document.getElementById("past_container");
    db.collection("events")
        .where("orgId", "==", organization.orgId)
        .where("end", "<", firebase.firestore.Timestamp.fromDate(getTodayDate()))
        .get()
        .then(querySnapshot => {
            let columnDefs = [
                {headerName: "", field: "expand", width: 75, cellRenderer: params => {
                    let link = document.createElement('span');
                    link.innerText = "Expand";
                    link.style.textDecoration = "underline";
                    link.style.cursor = "pointer";
                    link.addEventListener('click', () => {
                        window.open(`list_attendees.html?id=${params.data.id}&name=${params.data.name}`,'targetWindow', `toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes`);
                    });
                    return link;
                }},
                {headerName: "Name", field: "name", sortable: true, filter: true},
                {headerName: "Location", field: "location", sortable: true, filter: true},
                {headerName: "Start", field: "start", width: 100, sortable: true, filter: true},
                {headerName: "End", field: "end", width: 100, sortable: true, filter: true},
                {headerName: "Type", field: "type", width: 120, sortable: true, filter: true},
                {headerName: "Attendees", field: "attendeeCount", width: 105, sortable: true, filter: true},
                {headerName: "Check-ins", field: "checkInCount", width: 100, sortable: true, filter: true},
                {headerName: "id", field: "id", width: 0, hide: true}
            ];
            let rowData = [];
            querySnapshot.forEach(doc => {
                event = new Event(doc.data(), doc.id);
                employee = doc.data();
                rowData.push({id: doc.id, name: event.name, location: event.location, start: event.start, end: event.end, type: event.type, attendeeCount: event.attendeeCount, checkInCount: event.checkInCount});
            });
            showGrid(columnDefs, rowData, container, "Past Events");
        })
        .catch(error => {
            displayErrorModal(error);
        });
}

function submitAddEmployeeForm() {
    const email = document.getElementById("emp_email").value;
    db.collection("users")
        .where("email", "==", email)
        .get()
        .then(querySnapshot => {
            if (querySnapshot['empty']) {
                displayErrorModal("Provided email does not exist in our records.");
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
                        displaySuccessModal();
                    })
                    .catch(error => {
                        displayErrorModal(error);
                    });
            } else {
                displayErrorModal("The person is already tied to an organization.");
            }
        })
        .catch(error => {
            displayErrorModal(error);
        });
    return false;
}

function listEmployees() {
    const container = document.getElementById("employees_container");
    db.collection("users")
        .where("organization", "==", organization.orgId)
        .get()
        .then(querySnapshot => {
            let columnDefs = [
                {headerName: "First Name", field: "fName", sortable: true, filter: true},
                {headerName: "Last Name", field: "lName", sortable: true, filter: true},
                {headerName: "Email Address", field: "email", sortable: true, filter: true},
                {headerName: "Phone Number", field: "phoneNumber", sortable: true, filter: true}
            ];
            let rowData = [];
            querySnapshot.forEach(doc => {
                employee = doc.data();
                rowData.push({fName: employee["fName"], lName: employee["lName"], email: employee["email"], phoneNumber: employee["phoneNumber"]});
            });
            showGrid(columnDefs, rowData, container, "Employees");
        })
        .catch(error => {
            displayErrorModal(error);
        });
}

function submitOrgUpdateForm() {
    const name = document.getElementById("orgName").value;
    const email = document.getElementById("orgEmail").value;
    const location = document.getElementById("orgLocation").value;
    const address = document.getElementById("orgAddress").value;
    const orgPhoneNumber = document.getElementById("orgPhoneNumber").value;
    db.collection("organizations").doc(organization.orgId)
        .update({
            name, email, location, address, orgPhoneNumber
        })
        .then(() => {
            displaySuccessModal();
            organization.name = name;
            organization.email = email;
            organization.location = location;
            organization.address = address;
            organization.phoneNumber = orgPhoneNumber;  
        })
        .catch(error => {
            displayErrorModal(error);
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

    let user = firebase.auth().currentUser;
    const credential = firebase.auth.EmailAuthProvider.credential(
        user.email, 
        old_password
    );

    user.reauthenticateWithCredential(credential)
        .then(function() {
            user.updateEmail(email).then(function() {
                user.updatePassword(password)
                    .then(function() {
                        db.collection("users").doc(user.uid)
                            .update({
                                email, fName, lName
                            })
                            .then(() => {
                                displaySuccessModal();
                                admin.email = email;
                                admin.fName = fName;
                                admin.lName = lName;
                            })
                            .catch(error => {
                                displayErrorModal(error);
                            });
                    }).catch(function(error) {
                        displayErrorModal("Password Update Failed.");
                    });
              }).catch(function(error) {
                    displayErrorModal("Email Update Failed.");
              });
        }).catch(function(error) {
            displayErrorModal("Authentication Failed.");
        });
    return false;
}

function submitLoginForm() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    firebase.auth()
        .signInWithEmailAndPassword(email, password)
        .catch(error => {
            displayErrorModal(error.message);
        });

    firebase.auth().onAuthStateChanged(user => {
        if (user) window.location.href = "/";
        });
    return false;
}

function loadMap(x, y) {
    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/streets-v11',
        center: [x, y],
        zoom: 16
    });

    var geojson = {
        'type': 'FeatureCollection',
        'features': [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [x, y]
                }
            }
        ]
    };

    var canvas = map.getCanvasContainer();

    function onMove(e) {
        var coords = e.lngLat;
        canvas.style.cursor = 'grabbing';
        geojson.features[0].geometry.coordinates = [coords.lng, coords.lat];
        map.getSource('point').setData(geojson);
    }

    function onUp(e) {
        var coords = e.lngLat;
        longitude = coords.lng;
        latitude = coords.lat;
        map.off('mousemove', onMove);
        map.off('touchmove', onMove);
    }

    map.on('load', function() {
        map.addSource('point', {
            'type': 'geojson',
            'data': geojson
        });

        map.addLayer({
            'id': 'point',
            'type': 'circle',
            'source': 'point',
            'paint': {
                'circle-radius': 10,
                'circle-color': '#3887be'
            }
        });

        map.on('mouseenter', 'point', function() {
            map.setPaintProperty('point', 'circle-color', '#3bb2d0');
            canvas.style.cursor = 'move';
        });

        map.on('mouseleave', 'point', function() {
            map.setPaintProperty('point', 'circle-color', '#3887be');
            canvas.style.cursor = '';
        });

        map.on('mousedown', 'point', function(e) {
            e.preventDefault();
            canvas.style.cursor = 'grab';
            map.on('mousemove', onMove);
            map.once('mouseup', onUp);
        });

        map.on('touchstart', 'point', function(e) {
            if (e.points.length !== 1) return;
            e.preventDefault();
            map.on('touchmove', onMove);
            map.once('touchend', onUp);
        });

        map.addControl(new mapboxgl.NavigationControl());
    });
}

function adjustColor(former, next) {
    document.getElementById(former).style.color = "black";
    document.getElementById(former).style.backgroundColor = "white";
    document.getElementById(next).style.color = "white";
    document.getElementById(next).style.backgroundColor = "#2196f3";
}

function displaySuccessModal() {
    let modal = document.getElementById('successModal')
    modal.style.display = "block";
    document.getElementById('successModalX').onclick = () => {
        modal.style.display = "none";
    }
}

function displayErrorModal(error) {
    let modal = document.getElementById('errorModal')
    modal.style.display = "block";
    document.getElementById('errorModalX').onclick = () => {
        modal.style.display = "none";
    }
    document.getElementById("errorModalReason").innerText = error;
}

function csvToJson(csv) {
    let lines = csv.split("\n");
    let result = [];
    let headers = lines[0].split(",");
    headers = headers.map((header) => header.trim().slice(1, -1));
    for (let i = 1; i < lines.length; i++) {
        let obj = {};
        let currentLine = lines[i].split(",");
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentLine[j].trim().slice(1, -1);
        }
        result.push(obj);
    }
    return result;
}

function showGrid(columnDefs, rowData, container, sheetName) {
    var gridOptions = {
        columnDefs: columnDefs,
        rowData: rowData,
        pagination: true,
        animateRows: true
    };
    new agGrid.Grid(container, gridOptions);
    document.getElementById('export-btn').addEventListener('click', () => {
        let wb = {
            "SheetNames": [sheetName],
            Sheets: {
                [`${sheetName}`]: XLSX.utils.json_to_sheet(csvToJson(gridOptions.api.getDataAsCsv(gridOptions)))
            }
        };
        XLSX.writeFile(wb, `${sheetName}.xlsx`);
    });
    return gridOptions;
}

function fillProfileUpdateForm() {
    document.getElementById("up_email").value = admin.email;
    document.getElementById("up_fName").value = admin.fName;
    document.getElementById("up_lName").value = admin.lName;
}

function fillOrgUpdateForm() {
    document.getElementById("orgName").value = organization.name;
    document.getElementById("orgEmail").value = organization.email;
    document.getElementById("orgLocation").value = organization.location;
    document.getElementById("orgAddress").value = organization.address;
    document.getElementById("orgPhoneNumber").value = organization.phoneNumber;
}

function viewOngoingEvent(eventId) {
    fetchHTML(`view_ongoing.html`)
        .then(value => {
            content.innerHTML = value;
            
        });
}

function logOut() {
    firebase.auth().signOut().then(function() {
        window.location.href="/";
      }).catch(function(error) {
        // An error happened.
      });   
}