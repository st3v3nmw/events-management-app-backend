checkLoggedIn();
const content = document.getElementById("container");
fetchHTML("home.html")
    .then(value => {
        content.innerHTML = value;
    });

const tabs = ["create", "ongoing", "past", "add_employee", "manage_employees", "update_org", "update_profile"];
for (let link of tabs) {
    document.getElementById(link)
        .addEventListener('click', () => {
            fetchHTML(link+".html")
                .then(value => {
                    content.innerHTML = value;
                    switch(link) {
                        case "ongoing":
                            loadOnGoingEvents();
                            break;
                        case "finished":
                            loadPastEvents();
                            break;
                        case "manage_employees":
                            listEmployees();
                            break;
                        case "create":
                            document.getElementById("banner-image").addEventListener("change", readFile);
                            break;
                    }
                });
        });
}