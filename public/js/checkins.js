var $_GET=[];
window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi,function(a,name,value){$_GET[name]=value;});
const container = document.getElementById("checkin-list");

db.collection("tickets")
    .doc($_GET['ticketId'])
    .collection('checkIns')
    .get()
    .then(querySnapshot => {
        let columnDefs = [
            {headerName: "Time", field: "time", width: 128, sortable: true, filter: true},
            {headerName: "Agent", field: "checkInBy", width: 256, sortable: true, filter: true},
            {headerName: "Agent Email", field: "email", width: 256, sortable: true, filter: true}
        ];

        opt = showGrid(columnDefs, [], container, `checkins`);
        let rowData = [];
        querySnapshot.forEach(doc1 => {
            let d = doc1.data();
            let docRef = db.collection("users").doc(d['checkInBy']);
            docRef.get()
                .then(function(doc) {
                    if (doc.exists) {
                        let data = doc.data();
                        rowData.push({time: dateTimeString(d['time'].toDate()), checkInBy: `${data['fName']} ${data['lName']}`, email: data['email']});
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