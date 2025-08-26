import App from './app';
import {
    IndexRoute,
    UserRoute,
    AttendanceRoute,
    AuthRoute
} from './core/routes';
import { validateEnv } from './core/utils/validateEnv';

validateEnv();

const app = new App([
    new UserRoute(),
    new AuthRoute(),
    new AttendanceRoute(),
    new IndexRoute()
]);

app.listen();