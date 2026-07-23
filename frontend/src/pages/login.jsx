import { useState } from "react"
import api from "../services/api"

function Login() {

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleLogin = async (e) => {

        e.preventDefault()

        try {

            const response = await api.post(
                "/auth/login",
                {
                    email,
                    password
                }
            )

            console.log(response.data)

            localStorage.setItem(
                "token",
                response.data.access_token
            )

            alert("Login Successful")

        }
        catch (error) {

            console.log(error)

            alert(
                "Invalid Email or Password"
            )
        }
    }

    return (
        <div>
            <h1>Admin Login</h1>

            <form onSubmit={handleLogin}>

                <div>
                    <label>Email</label>
                    <br />

                    <input
                        type="email"
                        placeholder="Enter Email"
                        value={email}
                        onChange={(e) =>
                            setEmail(e.target.value)
                        }
                    />
                </div>

                <br />

                <div>
                    <label>Password</label>
                    <br />

                    <input
                        type="password"
                        placeholder="Enter Password"
                        value={password}
                        onChange={(e) =>
                            setPassword(e.target.value)
                        }
                    />
                </div>

                <br />

                <button type="submit">
                    Login
                </button>

            </form>
        </div>
    )
}

export default Login