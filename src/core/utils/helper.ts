const cheerio = require("cheerio");
import fs from 'fs';

import axios from "axios";
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { logo } from "./logo";
import { ICreateOrderItem } from '../../modules/order/interfaces/OrderInterface';


export default class HelperClass {
  static checkPhoneNumber(phoneNumber?: string): string {
    const phone = phoneNumber
      ? phoneNumber.startsWith("+234")
        ? phoneNumber
        : `+234${phoneNumber.replace(/^0+/, "")}`
      : "";
    return phone;
  }

  static formatPhoneNumber(number: string): string {
    let cleaned = number.replace(/\D/g, '');

    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    if (cleaned.length === 10) {
      return `+234${cleaned}`;
    } else if (cleaned.startsWith('234') && cleaned.length === 13) {

      return `+${cleaned}`;
    } else {
      throw new Error("Invalid phone number format");
    }
  }

  static titleCase(string: string): string {
    let sentence = string.toLowerCase().split(" ");
    sentence = sentence.filter((str) => str.trim().length > 0);
    for (let i = 0; i < sentence.length; i++) {
      sentence[i] = sentence[i][0].toUpperCase() + sentence[i].slice(1);
    }
    return sentence.join(" ");
  }

  static upperCase(string: string): string {
    let sentence = string.toUpperCase().split(" ");
    sentence = sentence.filter((str) => str.trim().length > 0);
    return sentence.join(" ");
  }

  static capitalCase(string: string): string {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }

  static generateRandomChar(length = 32, type = "alpha"): string {
    // "num", "upper", "lower", "upper-num", "lower-num", "alpha-num"
    let result = "";
    let characters =
      "ABCDEFGHIJKLMNPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    if (type === "num") characters = "0123456789";
    if (type === "upper-num")
      characters = "ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789";
    if (type === "lower-num")
      characters = "abcdefghijklmnopqrstuvwxyz0123456789";
    if (type === "upper") characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (type === "lower") characters = "abcdefghijklmnopqrstuvwxyz";
    if (type === "alpha")
      characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  static userNameValidator(string: string) {
    const strongRegex = new RegExp(/^[ A-Za-z0-9_-]*$/);
    if (!strongRegex.test(string)) {
      throw new Error(
        "Invalid character in username. Only hiphen (-) and underscore (_) are allowed"
      );
    }
  }

  static removeUnwantedProperties(object: unknown, properties: string[]) {
    let newObject: { [key: string]: string } = {};
    if (typeof object === "object" && object !== null) {
      newObject = { ...object };
      properties.forEach((property) => {
        delete newObject[property];
      });
    }
    return newObject;
  }


  static calculateAmountPercentage(args: {
    amount: number;
    percentage: number;
  }) {
    return (args.amount * args.percentage) / 100;
  }

  static isIdentifierEmailOrPhone(input: string) {
    // Regular expressions to check for email and phone number patterns
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phonePattern = /^[0-9]{15}$/; // Change this pattern to match the phone number format you expect
    return emailPattern.test(input)
      ? { isEmail: true }
      : phonePattern.test(input)
        ? { isPhoneNumber: true }
        : null;
  }
}


export const upsertModifierGroup = (productId: string, group: any) => ({
  where: { id: group.id ?? "" },
  update: {
    name: group.name,
    isRequired: group.isRequired,
    maxSelections: group.maxSelections,
    modifiers: group.modifiers ? { upsert: group.modifiers.map(upsertModifier) } : undefined,
  },
  create: {
    name: group.name,
    isRequired: group.isRequired,
    maxSelections: group.maxSelections,
    modifiers: group.modifiers ? { create: group.modifiers.map(createModifier) } : undefined,
  },
});

export const upsertModifier = (modifier: any) => ({
  where: { id: modifier.id ?? "" },
  update: {
    name: modifier.name,
    price: modifier.price,
    image: modifier.image,
  },
  create: createModifier(modifier),
});

export const createModifier = (modifier: any) => ({
  name: modifier.name,
  price: modifier.price,
  image: modifier.image,
});




