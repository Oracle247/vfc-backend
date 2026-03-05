import App from './app';
import {
    IndexRoute,
    UserRoute,
    AttendanceRoute,
    AuthRoute,
    InvoiceRoute,
    DepartmentRoute
} from './core/routes';
import { validateEnv } from './core/utils/validateEnv';

validateEnv();

const app = new App([
    new UserRoute(),
    new AuthRoute(),
    new AttendanceRoute(),
    new InvoiceRoute(),
    new DepartmentRoute(),
    new IndexRoute()
]);

app.listen();