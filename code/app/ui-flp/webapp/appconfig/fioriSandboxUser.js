(function() {
  "use strict";

  // If user details can be retrieved, set them for Mock Launchpad
  fetch('/user-api/currentUser')
    .then((res) => {
      return res.json()
    })
    .then((data) => {
      if(data) {
        window["sap-ushell-config"].services = {
          ...window["sap-ushell-config"].services,
          Container: {
            adapter: {
              config: {
                id: data.name || 'DefaultUser',
                firstName: data.firstname || 'Default',
                lastName: data.lastname || 'User',
                fullName: `${data.firstname} ${data.lastname}` || 'Default User',
                email: data.email || 'default.user@example.com'
              }
            }
          }
        };
      }else{
        console.error("Error: User infos empty");
      }
    }).catch((error) => {
        console.warn("Error: User infos could not be fetched")
        console.warn(`Error: ${error}`);
    });
}());