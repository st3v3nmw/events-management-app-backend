var $_GET=[];
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(a,name,value){$_GET[name]=value;});
eventId = $_GET['id'];
// document.getElementById('report-title').innerText = `${$_GET['name']} attendees`;
const container = document.getElementById("attendees-list");
db.collection("tickets")
    .where("eventId", "==", eventId)
    .get()
    .then(querySnapshot => {
        let columnDefs = [
            {headerName: "", field: "expand", width: 120, cellRenderer: params => {
                let link = document.createElement('span');
                link.innerText = "View Checkins";
                link.style.textDecoration = "underline";
                link.style.cursor = "pointer";
                link.addEventListener('click', () => {
                    window.open(`list_checkins.html?ticketId=${params.data.ticketId}`,'targetWindow', `toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes`);
                });
                return link;
            }},
            {headerName: "First Name", field: "fName", width: 96, sortable: true, filter: true},
            {headerName: "Last Name", field: "lName", width: 96, sortable: true, filter: true},
            {headerName: "Organization", field: "organization", width: 128, sortable: true, filter: true},
            {headerName: "Phone", field: "phoneNumber", width: 96, sortable: true, filter: true},
            {headerName: "Email", field: "email", width: 256, sortable: true, filter: true},
            {headerName: "Ticket", field: "ticketId", width: 0, hide: true}
        ];

        opt = showGrid(columnDefs, [], container, `${$_GET['name']} attendees`);
        let rowData = [];
        querySnapshot.forEach(doc1 => {
            let d = doc1.data();
            let docRef = db.collection("users").doc(d['userId']);
            docRef.get()
                .then(function(doc) {
                    if (doc.exists) {
                        let data = doc.data();
                        rowData.push({ticketId: doc1.id, fName: data['fName'], lName: data['lName'], organization: data['organization'], phoneNumber: data['phoneNumber'], email: data['email']});
                        opt.api.setRowData(rowData);
                        console.log(rowData);
                    } else {
                        console.log("No such document!");
                    }
            }).catch(function(error) {
                console.log("Error getting document:", error);
            });
        });
    })
    .catch(error => {
        console.log(error);
        displayErrorModal(error);
    });