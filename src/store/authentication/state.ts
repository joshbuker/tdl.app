export interface AuthenticationStateInterface {
  loggedIn: boolean,
  sessionToken: string;
}

function state(): AuthenticationStateInterface {
  return {
    loggedIn: false,
    sessionToken: ''
  }
};

export default state;
