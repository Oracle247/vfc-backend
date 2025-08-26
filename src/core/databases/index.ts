import { DB_URI } from '../../config';

const dbConnection = {
  url: DB_URI,
  options: {
    useNewUrlParser: true,
    useUnifiedTopology: true
  },
};

export { dbConnection }
