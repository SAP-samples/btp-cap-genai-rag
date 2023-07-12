(async function() {
  "use strict";

  window["sap-ushell-config"] = {
    defaultRenderer: "fiori2"  
  };  

  // If user details can be retrieved, set them for Mock Launchpad
  await fetch('/user-api/currentUser')
  .then((res) => res.json())
  .then((data) => {
    if(data) {
      window["sap-ushell-config"] = {
        ...window["sap-ushell-config"],
        services: {
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
        }
      };
    }else{
      console.error("Error: User infos empty");
    }
  })
  .catch((error) => {
    console.error("Error: User infos could not be fetched")
    console.error(`Error: ${error}`);
  });
}());