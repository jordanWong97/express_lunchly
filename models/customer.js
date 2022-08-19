"use strict";

/** Customer for Lunchly */

const db = require("../db");
const Reservation = require("./reservation");

/** Customer of the restaurant. */

class Customer {
  constructor({ id, firstName, lastName, phone, notes }) {
    this.id = id;
    this.firstName = firstName;
    this.lastName = lastName;
    this.phone = phone;
    this.notes = notes;
  }

  /** find all customers. */

  static async all() {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           ORDER BY last_name, first_name`,
    );
    return results.rows.map(c => new Customer(c));
  }

  /** get a customer by ID. */

  static async get(id) {
    const results = await db.query(
      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE id = $1`,
      [id],
    );

    const customer = results.rows[0];

    if (customer === undefined) {
      const err = new Error(`No such customer: ${id}`);
      err.status = 404;
      throw err;
    }

    return new Customer(customer);
  }

  /**get any customers where search term matches part of first or last name */
  // try to refactor with concat and without the firstname/lastname, so using only one term
  static async find(name) {

    const fullName = name.split(' ');
    const firstName = fullName[0];
    const lastName = fullName[fullName.length - 1];

    const results = await db.query(

      `SELECT id,
                  first_name AS "firstName",
                  last_name  AS "lastName",
                  phone,
                  notes
           FROM customers
           WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR
                  (first_name ILIKE $2 AND last_name ILIKE $3)`,
      [`%${name}%`,`%${firstName}%`,`%${lastName}%`]
    );

    if (results === undefined) {
      const err = new Error(`No results matching : ${name}`);
      err.status = 404;
      throw err;
    }

    return results.rows.map(c => new Customer(c));
  }

  /** Returns top 10 customer by most reservations */
  static async topTen() {

  const results = await db.query(
      `SELECT c.id AS id,
              c.first_name AS "firstName",
              c.last_name AS "lastName",
              c.phone,
              c.notes,
              COUNT(*) AS count
        FROM reservations AS r
        JOIN customers as c ON c.id = r.customer_id
        GROUP BY c.id
        ORDER BY count DESC
        LIMIT 10
    `
    );

    return results.rows.map(row => new Customer(row));
  }

  /** returns customer first & last name joined by space */

    // refactor w string interpolation
  fullName() {
    return this.firstName + ' ' + this.lastName;
  }

  /** get all reservations for this customer. */

  async getReservations() {
    return await Reservation.getReservationsForCustomer(this.id);
  }

  /** saves customer for creation / updating. */

  async save() {
    if (this.id === undefined) {
      const result = await db.query(
        `INSERT INTO customers (first_name, last_name, phone, notes)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
        [this.firstName, this.lastName, this.phone, this.notes],
      );
      this.id = result.rows[0].id;
    } else {
      await db.query(
        `UPDATE customers
             SET first_name=$1,
                 last_name=$2,
                 phone=$3,
                 notes=$4
             WHERE id = $5`, [
        this.firstName,
        this.lastName,
        this.phone,
        this.notes,
        this.id,
      ],
      );
    }
  }
}

module.exports = Customer;
