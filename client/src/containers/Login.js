import React from 'react';
import { Form, Icon, Input, Button, Row, Col } from 'antd';
import { graphql, compose } from 'react-apollo';
import { connect } from 'react-redux';

import normalizeErrors from '../helpers/normalizeErrors';
import { login, setUser } from '../actions';
import { LoginMutation } from '../graphql/mutations';

const FormItem = Form.Item;

class Login extends React.Component {
  state = {
    loading: false,
  };
  handleSubmit = (e) => {
    e.preventDefault();
    this.setState({ loading: true });
    this.props.form.validateFieldsAndScroll(async (err, values) => {
      if (!err) {
        const { data: { login: { isOk, errors, token, user} } } = await this.props.mutate({
          variables: values,
        });
        if (isOk) {
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          this.props.login();
          this.props.setUser(user);
          this.props.history.push('/feed');
          this.setState({ loading: false });
        } else if (errors) {
          const errorsObj = normalizeErrors(errors);

          Object.entries(errorsObj).forEach(([key, value]) => {
            let newValue;
            if (value.indexOf('already taken') > -1) {
              newValue = `${key} is ${value}`;
            } else {
              newValue = value;
            }
            this.props.form.setFields({
              [key]: {
                value: '',
                errors: [new Error(newValue)],
              },
            });
          });
          this.setState({ loading: false });
        }
      }
    });
  };
  render() {
    const { getFieldDecorator } = this.props.form;
    const { loading } = this.state;

    return (
      <React.Fragment>
        <Row type="flex" justify="center" style={{ textAlign: 'center' }}>
          <Col xs={16} sm={14} md={12} lg={10} xl={8}>
            <h1 style={{ color: '#fff' }}> Log In </h1>
          </Col>
        </Row>
        <Row type="flex" justify="center">
          <Col xs={16} sm={14} md={12} lg={10} xl={8}>
            <Form onSubmit={this.handleSubmit}>
              <FormItem>
                {getFieldDecorator('email', {
                  rules: [
                    {
                      type: 'email',
                      message: 'The input is not valid E-mail!',
                    },
                    {
                      required: true,
                      message: 'Please input your username',
                    },
                  ],
                })(<Input
                  prefix={<Icon type="mail" style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="Email"
                />)}
              </FormItem>
              <FormItem>
                {getFieldDecorator('password', {
                  rules: [
                    {
                      required: true,
                      message: 'Please input your password!',
                    },
                  ],
                })(<Input
                  prefix={<Icon type="lock" style={{ color: 'rgba(0,0,0,.25)' }} />}
                  placeholder="Password"
                  type="password"
                />)}
              </FormItem>
              <FormItem>
                <Button
                  loading={!!loading}
                  style={{ width: '100%' }}
                  type="primary"
                  htmlType="submit"
                >
                  Login
                </Button>
              </FormItem>
            </Form>
          </Col>
        </Row>
      </React.Fragment>
    );
  }
}

export default compose(
  graphql(LoginMutation),
  connect(undefined, { login, setUser }),
  Form.create(),
)(Login);
